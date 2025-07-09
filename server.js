import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Client } = pkg;

const upload = multer();
const app = express();
const port = process.env.PORT || 3001;

// middleware
app.use(cors());
app.use(bodyParser.json());

// Postgres client
const client = new Client({
  user:     'dbstn',   
  host:     'stn-kota.cqlkymqmgfch.us-east-1.rds.amazonaws.com',
  database: 'postgres',   
  password: '9.rV{)(We:9>q0oCRV~WfP7(i2a$sDp<',
  port:     5432,
  ssl:      { rejectUnauthorized: false }
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Error connecting to PostgreSQL database', err));

// helper to upsert one point into the 4 tables
async function upsertPoint({
  id, first_name, last_name, age, gender,
  incident_date, city, state, latitude, longitude,
  url = 'https://saytheirnames.shinyapps.io/STNWebApp/_w_4d2adf62/0000.jpg',
  bio_info = 'Biographical information is not available at this time. Please contact STN@nonopera.org if you have information you would like to share.'
}) {
  await client.query('BEGIN');
  try {
    // 1) victims
    await client.query(`
      INSERT INTO public.victims(
        victim_id, first_name, last_name, age, gender, bio_info
      ) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(victim_id) DO UPDATE
        SET first_name=EXCLUDED.first_name,
            last_name =EXCLUDED.last_name,
            age       =EXCLUDED.age,
            gender    =EXCLUDED.gender,
            bio_info  =EXCLUDED.bio_info;
    `, [
      id,
      first_name,
      last_name,
      age,
      gender,
      bio_info   
    ]);

    // 2) incidents
    const incRes = await client.query(`
      INSERT INTO public.incidents(incident_date, city, state, latitude, longitude)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (incident_date, city, state, latitude, longitude) DO NOTHING
      RETURNING incident_id;
    `, [incident_date, city, state, latitude, longitude]);

    let incident_id;
    if (incRes.rows[0]) {
      incident_id = incRes.rows[0].incident_id;
    } else {
      const lookup = await client.query(`
        SELECT incident_id FROM public.incidents
         WHERE incident_date=$1 AND city=$2 AND state=$3 AND latitude=$4 AND longitude=$5
      `, [incident_date, city, state, latitude, longitude]);
      incident_id = lookup.rows[0].incident_id;
    }

    // 3) media_references
    const mediaRes = await client.query(`
      INSERT INTO public.media_references(url)
      VALUES($1)
      ON CONFLICT(url) DO NOTHING
      RETURNING media_id;
    `, [url]);

    let media_id;
    if (mediaRes.rows[0]) {
      media_id = mediaRes.rows[0].media_id;
    } else {
      const lookup = await client.query(`
        SELECT media_id FROM public.media_references WHERE url=$1
      `, [url]);
      media_id = lookup.rows[0].media_id;
    }

    // 4) incident_victims
    await client.query(`
      INSERT INTO public.incident_victims(victim_id, incident_id, media_id)
      VALUES($1,$2,$3)
      ON CONFLICT DO NOTHING;
    `, [id, incident_id, media_id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

// GET all points
app.get('/api/data', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT
        inc.latitude,
        inc.longitude,
        inc.incident_date::TEXT AS incident_date,
        inc.city,
        inc.state,
        v.victim_id   AS id,
        v.first_name,
        v.last_name,
        v.age,
        v.gender,
        v.bio_info,
        m.url
      FROM public.incident_victims iv
      JOIN public.victims v
        ON iv.victim_id = v.victim_id
      JOIN public.incidents inc
        ON iv.incident_id = inc.incident_id
      JOIN public.media_references m
        ON iv.media_id = m.media_id
      ORDER BY inc.incident_date ASC, v.victim_id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a point by victim_id
app.delete('/api/points/:id', async (req, res) => {
  const vid = parseInt(req.params.id, 10);

  try {
    await client.query('BEGIN');

    const { rows: ivRows } = await client.query(
      `SELECT incident_id, media_id
         FROM public.incident_victims
        WHERE victim_id = $1`,
      [vid]
    );

    await client.query(
      `DELETE FROM public.incident_victims
        WHERE victim_id = $1`,
      [vid]
    );
    await client.query(
      `DELETE FROM public.victims
        WHERE victim_id = $1`,
      [vid]
    );

    for (const { incident_id } of ivRows) {
      await client.query(
        `DELETE FROM public.incidents
          WHERE incident_id = $1
            AND NOT EXISTS (
              SELECT 1
                FROM public.incident_victims iv2
               WHERE iv2.incident_id = public.incidents.incident_id
            )`,
        [incident_id]
      );
    }

    for (const { media_id } of ivRows) {
      if (media_id != null) {
        await client.query(
          `DELETE FROM public.media_references
            WHERE media_id = $1
              AND NOT EXISTS (
                SELECT 1
                  FROM public.incident_victims iv3
                 WHERE iv3.media_id = public.media_references.media_id
              )`,
          [media_id]
        );
      }
    }

    await client.query('COMMIT');
    res.sendStatus(204);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting point + cleanup:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST a single point
app.post('/api/points', async (req, res) => {
  try {
    await upsertPoint(req.body);
    res.sendStatus(201);
  } catch (err) {
    console.error('Error upserting point:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST bulk CSV upload
app.post('/api/points/bulk',
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true }, 
      async (err, records) => {
        if (err) {
          console.error('CSV parse error:', err);
          return res.status(400).json({ error: 'Invalid CSV format' });
        }
        try {
          for (const row of records) {
            await upsertPoint({
              id            : parseInt(row.id, 10),
              first_name    : row.first_name,
              last_name     : row.last_name,
              age           : row.age ? parseInt(row.age, 10) : null,
              gender        : row.gender,
              incident_date : row.incident_date,
              city          : row.city,
              state         : row.state,
              latitude      : parseFloat(row.latitude),
              longitude     : parseFloat(row.longitude),
              url           : row.url || 'https://saytheirnames.shinyapps.io/STNWebApp/_w_4d2adf62/0000.jpg',
              bio_info      : row.bio_info ||
                              'Biographical information is not available at this time. ' +
                              'Please contact STN@nonopera.org if you have information you would like to share.'
            });
          }
          res.json({ inserted: records.length });
        } catch (e) {
          console.error('Error processing bulk upload:', e);
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    );
  }
);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
