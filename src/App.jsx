import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Button, Container } from '@mui/material';
import BulkUpload    from './pages/BulkUpload';
import AddPoint      from './pages/AddPoint';
import ManagePoints  from './pages/ManagePoints';

export default function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {['Bulk Upload','Add Point','Manage Points'].map((label,idx)=>(
            <Button key={idx} component={Link} to={['/','/add','/manage'][idx]} color="inherit">
              {label}
            </Button>
          ))}
        </Toolbar>
      </AppBar>

      <Container sx={{ my:4 }}>
        <Routes>
          <Route path="/"       element={<BulkUpload/>}/>
          <Route path="/add"    element={<AddPoint/>}/>
          <Route path="/manage" element={<ManagePoints/>}/>
        </Routes>
      </Container>
    </>
  );
}
