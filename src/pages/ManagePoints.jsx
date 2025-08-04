import React, { useEffect, useState } from 'react';
import {
  Box,
  TableContainer,
  Typography,
  Button,
  IconButton,
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
import { Edit, Save, Cancel, Delete } from '@mui/icons-material';
import axios from 'axios';

export default function ManagePoints() {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [editingId, setEditingId]   = useState(null);
  const [draftRow, setDraftRow]     = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/data');
      const sorted = res.data.sort((a, b) =>
        new Date(b.incident_date) - new Date(a.incident_date)
      );
      setData(sorted);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmDelete = (id) => {
    setPendingDeleteId(id);
    setDialogOpen(true);
  };
  const handleDelete = async () => {
    setDialogOpen(false);
    if (pendingDeleteId == null) return;
    try {
      await axios.delete(`http://localhost:3001/api/points/${pendingDeleteId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting point:', error);
    } finally {
      setPendingDeleteId(null);
    }
  };
  const handleCancelDelete = () => {
    setDialogOpen(false);
    setPendingDeleteId(null);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraftRow({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraftRow({});
  };
  const saveEdit = async () => {
    try {
      await axios.put(
        `http://localhost:3001/api/points/${editingId}`,
        draftRow
      );
      setEditingId(null);
      setDraftRow({});
      fetchData();
    } catch (error) {
      console.error('Error updating point:', error);
    }
  };

  const filtered = data.filter(row => {
    const term = searchTerm.toLowerCase();
    return (
      row.id.toString().includes(term) ||
      row.first_name.toLowerCase().includes(term) ||
      row.last_name.toLowerCase().includes(term) ||
      row.city.toLowerCase().includes(term) ||
      row.state.toLowerCase().includes(term) ||
      row.incident_date.includes(term) ||
      (row.url || '').toLowerCase().includes(term) ||
      (row.bio_info || '').toLowerCase().includes(term)
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
          placeholder="Search…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </Box>
  
      <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
  <Table sx={{ minWidth: 1000 }}>
    <TableHead>
      <TableRow>
        {[
          'ID','First','Last','Date','City','State',
          'Latitude','Longitude','URL','Bio','Actions'
        ].map((h) => (
          <TableCell
            key={h}
            sx={
              h === 'Actions'
                ? {
                    position: 'sticky',
                    right: 0,
                    backgroundColor: 'background.paper',
                    zIndex: 2,
                    minWidth: 100
                  }
                : undefined
            }
          >
            {h}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>

    <TableBody>
      {filtered.map((row) => {
        const isEditing = editingId === row.id;
        return (
          <TableRow key={row.id}>
            <TableCell>
              {String(row.id).padStart(6, '0')}
            </TableCell>
            {[
              'first_name','last_name','incident_date',
              'city','state','latitude','longitude',
              'url','bio_info'
            ].map((field) => (
              <TableCell key={field}>
                {isEditing ? (
                  <TextField
                    size="small"
                    fullWidth
                    name={field}
                    value={draftRow[field] || ''}
                    onChange={(e) =>
                      setDraftRow((dr) => ({
                        ...dr,
                        [field]: e.target.value
                      }))
                    }
                  />
                ) : (
                  String(row[field] ?? '')
                )}
              </TableCell>
            ))}

            {/* sticky Actions cell */}
            <TableCell
              sx={{
                position: 'sticky',
                right: 0,
                backgroundColor: 'background.paper',
                zIndex: 1,
                minWidth: 100
              }}
            >
              {isEditing ? (
                <>
                  <IconButton size="small" onClick={saveEdit}>
                    <Save />
                  </IconButton>
                  <IconButton size="small" onClick={cancelEdit}>
                    <Cancel />
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton size="small" onClick={() => startEdit(row)}>
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => confirmDelete(row.id)}
                  >
                    <Delete />
                  </IconButton>
                </>
              )}
            </TableCell>
          </TableRow>
        );
      })}

      {filtered.length === 0 && (
        <TableRow>
          <TableCell colSpan={11} align="center">
            No matching records
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</TableContainer>


      <Dialog
        open={dialogOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete point&nbsp;
            <strong>ID #{pendingDeleteId}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
