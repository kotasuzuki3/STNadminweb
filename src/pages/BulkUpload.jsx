import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

export default function BulkUpload() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');

  const handleSubmit = async () => {
    if (!file) return setMsg('Select a CSV first');
    const form = new FormData();
    form.append('file', file);
    try {
      await axios.post('/api/points/bulk', form, {
        headers: { 'Content-Type':'multipart/form-data' }
      });
      setMsg('Uploaded successfully!');
    } catch (e) {
      setMsg('Upload failed: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Add New Data
      </Typography>

      <input
        type="file"
        accept=".csv"
        onChange={e => setFile(e.target.files[0])}
        style={{ display: 'block', marginBottom: 16 }}
      />

      <Button variant="contained" onClick={handleSubmit}>
        Upload CSV
      </Button>

      {msg && (
        <Typography mt={2} color={msg.startsWith('Upload failed') ? 'error' : 'primary'}>
          {msg}
        </Typography>
      )}
    </Box>
  );
}
