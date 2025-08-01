import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import { parse } from 'csv-parse';
import pkg from 'pg';
import fetch from 'node-fetch';
import 'dotenv/config';

const { Client } = pkg;

const GEOCODER = {
  async lookup(address, city, state) {
    const q = encodeURIComponent([address, city, state].filter(Boolean).join(', '));
    const url = `https://us1.locationiq.com/v1/search.php`
            + `?key=${process.env.LOCATIONIQ_KEY}`
            + `&q=${q}`
            + `&format=json&limit=1`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`LocationIQ HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Geocoding failed: no results');
    }

    return {
      latitude:  parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };
  }
};

const upload = multer();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

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

  const DEFAULT_URL = 'https://saytheirnames.shinyapps.io/STNWebApp/_w_4d2adf62/0000.jpg';
  const DEFAULT_BIO = 'Biographical information is not available at this time. Please contact STN@nonopera.org if you have information you would like to share.';
  
  async function upsertPoint({
    id, first_name, last_name, age, gender,
    incident_date, city, state, 
    street_address, latitude, longitude,
    url, bio_info
  }) {
    const safeUrl     = url     && url.trim()     ? url.trim()     : DEFAULT_URL;
    const safeBioInfo = bio_info && bio_info.trim() ? bio_info.trim() : DEFAULT_BIO;

    if (!city || !state) {
      throw new Error('city and state are required');
    }
    if ((latitude == null || longitude == null) && !street_address) {
      throw new Error('Either lat/long or street_address must be provided');
    }
    if (( !latitude || !longitude ) && street_address) {
      const coords = await GEOCODER.lookup(street_address, city, state);
      latitude  = coords.latitude.toString();
      longitude = coords.longitude.toString();
    }
    const safeLat = parseFloat(latitude);
    const safeLon = parseFloat(longitude);

    if (Number.isNaN(safeLat) || Number.isNaN(safeLon)) {
      throw new Error('Could not determine latitude/longitude');
    }
    await client.query('BEGIN');
    try {
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
      `, [ id, first_name, last_name, age, gender, safeBioInfo ]);

      const incRes = await client.query(`
         INSERT INTO public.incidents(
           incident_date,
           city,
           state,
           latitude,
           longitude,
           street_address
         )
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT (incident_date, city, state, latitude, longitude, street_address) DO NOTHING
         RETURNING incident_id;
       `, [
         incident_date,
         city,
         state,
         safeLat,         
         safeLon,        
         street_address  
       ]);

    let incident_id;
    if (incRes.rows[0]) {
      incident_id = incRes.rows[0].incident_id;
    } else {
      const lookup = await client.query(`
        SELECT incident_id FROM public.incidents
         WHERE incident_date=$1 AND city=$2 AND state=$3 AND latitude=$4 AND longitude=$5 AND street_address= $6
      `, [incident_date, city, state, safeLat, safeLon, street_address]);
      incident_id = lookup.rows[0].incident_id;
    }

    const mediaRes = await client.query(`
    INSERT INTO public.media_references(url)
    VALUES($1)
    ON CONFLICT (url)
      DO UPDATE SET url = EXCLUDED.url
    RETURNING media_id;
  `, [ safeUrl ]);
  
  const media_id = mediaRes.rows[0].media_id;

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
        -- if bio_info is empty string, substitute your default
        CASE WHEN v.bio_info = '' THEN
          '${DEFAULT_BIO.replace(/'/g,"''")}'
        ELSE
          v.bio_info
        END AS bio_info,
        -- same for url
        CASE WHEN m.url = '' THEN
          '${DEFAULT_URL}'
        ELSE
          m.url
        END AS url
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


app.post('/api/points', async (req, res) => {
  try {
    let { id, ...rest } = req.body;
    if (!id) {
    const { rows } = await client.query(
      `SELECT COALESCE(MAX(victim_id), 0) AS max_id FROM public.victims`
      );
    id = rows[0].max_id + 1;
  }
  await upsertPoint({ id, ...rest });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Error upserting point:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
})

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
          const { rows } = await client.query(
            `SELECT COALESCE(MAX(victim_id), 0) AS max_id FROM public.victims`
          );
          let nextId = rows[0].max_id + 1;

          for (const row of records) {
            const maybe = parseInt(row.id, 10);
            const id = Number.isInteger(maybe) ? maybe : nextId++;

            await upsertPoint({
              id,
              first_name    : row.first_name,
              last_name     : row.last_name,
              age           : row.age ? parseInt(row.age, 10) : null,
              gender        : row.gender,
              incident_date : row.incident_date,
              street_address: row.street_address,
              city          : row.city,
              state         : row.state,
              latitude      : row.latitude,   
              longitude     : row.longitude,
              url           : row.url,
              bio_info      : row.bio_info
            });
          }

          return res.json({ inserted: records.length });
        } catch (e) {
          console.error('Error processing bulk upload:', e);
          return res.status(500).json({ error: e.message });
        }
      }
    );
  }
);


app.put('/api/points/:id', async (req, res) => {
  const vid = parseInt(req.params.id, 10)
  const {
    first_name, last_name, age, gender,
    incident_date, city, state,
    latitude, longitude,
    url = DEFAULT_URL,
    bio_info = DEFAULT_BIO
  } = req.body

  try {
    await client.query('BEGIN')

    await client.query(`
      UPDATE public.victims
         SET first_name = $2,
             last_name  = $3,
             age        = $4,
             gender     = $5,
             bio_info   = $6
       WHERE victim_id = $1
    `, [vid, first_name, last_name, age, gender, bio_info])

    const { rows:[iv] } = await client.query(`
      SELECT incident_id
        FROM public.incident_victims
       WHERE victim_id = $1
    `, [vid])
    const incident_id = iv.incident_id

    await client.query(`
      UPDATE public.incidents
         SET incident_date = $2,
             city          = $3,
             state         = $4,
             latitude      = $5,
             longitude     = $6
       WHERE incident_id = $1
    `, [incident_id, incident_date, city, state, latitude, longitude])

    const mediaRes = await client.query(`
      INSERT INTO public.media_references(url)
      VALUES($1)
      ON CONFLICT (url) DO UPDATE SET url = EXCLUDED.url
      RETURNING media_id
    `, [url])
    const media_id = mediaRes.rows[0].media_id

    await client.query(`
      UPDATE public.incident_victims
         SET media_id = $2
       WHERE victim_id = $1
    `, [vid, media_id])

    await client.query('COMMIT')
    res.sendStatus(204)

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error updating point:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});