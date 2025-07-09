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
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/bulk`, form, {
        headers: { 'Content-Type':'multipart/form-data' }
      });
      setMsg('Uploaded successfully!');
    } catch (e) {
      setMsg('Upload failed: ' + e.message);
    }
  };

  return (
    <Box>
      <Typography variant="h5">Bulk Upload</Typography>
      <input
        type="file"
        accept=".csv"
        onChange={e => setFile(e.target.files[0])}
        style={{ marginTop:16 }}
      />
      <Box mt={2}>
        <Button variant="contained" onClick={handleSubmit}>
          Upload CSV
        </Button>
      </Box>
      {msg && <Typography mt={2}>{msg}</Typography>}
    </Box>
  );
}
