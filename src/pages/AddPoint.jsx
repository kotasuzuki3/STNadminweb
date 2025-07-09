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
        first_name:  '',
        last_name:   '',
        age:         '',
        gender:      '',
        incident_date: '',
        city:        '',
        state:       '',
        latitude:    '',
        longitude:   ''
      });
    } catch (e) {
      console.error(e);
      setMsg('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Add Single Point
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(form).map(([key, val]) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField
              fullWidth
              label={key.replace('_',' ').toUpperCase()}
              name={key}
              value={val}
              onChange={handleChange}
              size="small"
            />
          </Grid>
        ))}
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
