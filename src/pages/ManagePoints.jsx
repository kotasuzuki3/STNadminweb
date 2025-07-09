import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

export default function ManagePoints() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/data');
      setData(res.data);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/points/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting point:', error);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Manage Points
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            {['ID', 'First', 'Last', 'Date', 'City', 'State', 'Actions'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.id}</TableCell>
              <TableCell>{row.first_name}</TableCell>
              <TableCell>{row.last_name}</TableCell>
              <TableCell>{row.incident_date}</TableCell>
              <TableCell>{row.city}</TableCell>
              <TableCell>{row.state}</TableCell>
              <TableCell>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDelete(row.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
