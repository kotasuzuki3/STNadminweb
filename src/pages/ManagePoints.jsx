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
  TextField,
  CircularProgress,
  TableSortLabel
} from '@mui/material';
import axios from 'axios';

export default function ManagePoints() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState(null); 

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

  const filteredData = data.filter((row) => {
    const term = searchTerm.toLowerCase();
    return (
      row.id.toString().includes(term) ||
      row.first_name.toLowerCase().includes(term) ||
      row.last_name.toLowerCase().includes(term) ||
      row.city.toLowerCase().includes(term) ||
      row.state.toLowerCase().includes(term) ||
      row.incident_date.includes(term)
    );
  });

  const sortedData = sortOrder
    ? [...filteredData].sort((a, b) => {
        const da = new Date(a.incident_date);
        const db = new Date(b.incident_date);
        return sortOrder === 'asc'
          ? da - db
          : db - da;
      })
    : filteredData;

  const handleSortClick = () => {
    setSortOrder((prev) =>
      prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
    );
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
      {/* header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Manage Points</Typography>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            {['ID', 'First', 'Last'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}

            {/* Date header with sortable label */}
            <TableCell sortDirection={sortOrder || false}>
              <TableSortLabel
                active={!!sortOrder}
                direction={sortOrder || 'asc'}
                onClick={handleSortClick}
              >
                Date
              </TableSortLabel>
            </TableCell>

            {['City', 'State', 'Actions'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedData.map((row) => (
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

          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No matching records
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
