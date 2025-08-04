import React, { Fragment } from 'react';     
import { Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Container,
  Divider                 
} from '@mui/material';

import BulkUpload    from './pages/BulkUpload';
import AddName      from './pages/AddName';
import ManagePoints  from './pages/ManagePoints';

export default function App() {
  return (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1 }}>
          {[
            { to: '/',        label: 'Upload Data' },
            { to: '/add',     label: 'Add Name'   },
            { to: '/manage',  label: 'Manage Points' }
          ].map(({ to, label }, i, arr) => (
            <Fragment key={to}>
              <Button
                component={Link}
                to={to}
                color="inherit"
              >
                {label}
              </Button>
              {i < arr.length - 1 && (
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ bgcolor: 'rgba(255,255,255,0.5)' }}
                />
              )}
            </Fragment>
          ))}

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.5)' }} />

          <Button
            component="a"
            href="/template.csv"
            download
            color="inherit"
          >
            Download CSV Template
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ my: 4 }}>
        <Routes>
          <Route path="/"       element={<BulkUpload />} />
          <Route path="/add"    element={<AddName />} />
          <Route path="/manage" element={<ManagePoints />} />
        </Routes>
      </Container>
    </>
  );
}
