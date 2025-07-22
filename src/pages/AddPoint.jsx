import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid
} from '@mui/material';
import axios from 'axios';

const fieldMeta = {
  id:            { label: 'ID',            required: false },
  first_name:    { label: 'First Name',    required: true  },
  last_name:     { label: 'Last Name',     required: true  },
  age:           { label: 'Age',           required: true  },
  gender:        { label: 'Gender',        required: true  },
  incident_date: { label: 'Incident Date', required: true  },
  city:          { label: 'City',          required: true  },
  state:         { label: 'State',         required: true  },
  street_address:{ label: 'Address',      
                  required: form => !(form.latitude && form.longitude)
                },
  latitude:      { label: 'Latitude',    
                  required: form => !form.street_address
                },
  longitude:     { label: 'Longitude',    
                  required: form => !form.street_address
                },
  url:           { label: 'URL',           required: false },
  bio_info:      { label: 'Bio Info',      required: false },
};


export default function AddPoint() {
  const [form, setForm] = useState({
    id:          '',
    first_name:  '',
    last_name:   '',
    age:         '',
    gender:      '',
    incident_date: '',
    street_address: '',
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
    if (
      !form.street_address.trim() &&
      !(form.latitude && form.longitude)
    ) {
      return setMsg(
        'You must supply either an Address or both Latitude & Longitude.'
      );
    }

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
        street_address: '',
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

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Add Single Point
      </Typography>
  
      <Grid container spacing={2}>
        {Object.entries(form).map(([key, val]) => {
          const meta = fieldMeta[key];
          const isRequired =
            typeof meta.required === 'function'
              ? meta.required(form)
              : meta.required;

          const isDisabled =
            (key === 'latitude' || key === 'longitude') &&
            Boolean(form.street_address);
          const label = meta.label + (isRequired ? ' *' : ' (optional)');
  
          return (
            <Grid item xs={12} sm={6} key={key}>
              <TextField
                fullWidth
                label={label}
                name={key}
                value={val}
                onChange={handleChange}
                required={isRequired}
                disabled={isDisabled}
                size="small"
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
        <Typography
          mt={2}
          color={msg.startsWith('Error') ? 'error' : 'primary'}
        >
          {msg}
        </Typography>
      )}
    </Box>
  );
}
