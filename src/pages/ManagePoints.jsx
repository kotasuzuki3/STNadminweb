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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import axios from 'axios';

export default function ManagePoints() {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/data');
      const sorted = res.data.sort((a, b) => {
        const da = new Date(a.incident_date);
        const db = new Date(b.incident_date);
        return db - da;
      });

      setData(sorted);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const confirmDelete = (id) => {
    setPendingDeleteId(id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    const id = pendingDeleteId;
    setDialogOpen(false);
    if (id == null) return;
    try {
      await axios.delete(`http://localhost:3001/api/points/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting point:', error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setPendingDeleteId(null);
  };

  const filtered = data.filter(row => {
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
            {['ID', 'First', 'Last', 'Date', 'City', 'State', 'Actions'].map(h => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map(row => (
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
                  onClick={() => confirmDelete(row.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No matching records
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete point&nbsp;
            <strong>ID #{pendingDeleteId}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
