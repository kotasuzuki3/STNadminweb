import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid
} from '@mui/material';
import axios from 'axios';

export default function AddPoint() {
  const [form, setForm] = useState({
    id:          '',
    first_name:  '',
    last_name:   '',
    age:         '',
    gender:      '',
    incident_date: '',
    city:        '',
    state:       '',
    latitude:    '',
    longitude:   '',
    url:          '',
    bio_info:     ''
  });
  const [msg, setMsg] = useState('');

  const handleChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:3001/api/points', form);
      setMsg('Point added!');
      setForm({
        id:           '',
        first_name:  '',
        last_name:   '',
        age:         '',
        gender:      '',
        incident_date: '',
        city:        '',
        state:       '',
        latitude:    '',
        longitude:   '',
        url:          '',
        bio_info:     ''
      });
    } catch (e) {
      if (e.response?.status === 409) {
        setMsg(`Error: ${e.response.data.error}`); 
      } else {
        setMsg('Error: ' + (e.response?.data?.error || e.message));
      }
    }
  };

  const fieldMeta = {
    id:            { label: 'ID',            required: false },
    first_name:    { label: 'First Name',    required: true  },
    last_name:     { label: 'Last Name',     required: true  },
    age:           { label: 'Age',           required: true },
    gender:        { label: 'Gender',        required: true },
    incident_date: { label: 'Incident Date', required: true  },
    city:          { label: 'City',          required: true  },
    state:         { label: 'State',         required: true  },
    latitude:      { label: 'Latitude',      required: true  },
    longitude:     { label: 'Longitude',     required: true  },
    url:           { label: 'URL',           required: false  },
    bio_info:      { label: 'Bio Info',      required: false  },
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Add Single Point
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(form).map(([key, val]) => {
          const meta = fieldMeta[key];
          const label = meta.label + (meta.required ? ' *' : ' (optional)');
          return (
            <Grid item xs={12} sm={6} key={key}>
              <TextField
                fullWidth
                size="small"
                name={key}
                value={val}
                onChange={handleChange}

                required={meta.required}

                label={label}

                helperText={meta.required ? '' : 'this field is optional'}
              />
            </Grid>
          );
        })}
      </Grid>
      <Box mt={2}>
        <Button variant="contained" onClick={handleSubmit}>
          Submit
        </Button>
      </Box>
      {msg && (
        <Typography mt={2} color={msg.startsWith('Error') ? 'error' : 'primary'}>
          {msg}
        </Typography>
      )}
    </Box>
  );
}
