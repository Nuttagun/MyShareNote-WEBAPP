import React, { useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { MdEditSquare } from "react-icons/md";
import "./mypost.css";

import { getNotes, deleteNote } from "../../service/post";
import ModalEdit from "./Edit/index"

const Mypost = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState<string>("");

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editNoteData, setEditNoteData] = useState<any>(null);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleOpenDeleteDialog = (noteId: number) => {
    setSelectedNoteId(noteId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedNoteId(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedNoteId !== null) {
      const res = await deleteNote(selectedNoteId);
      if (res) {
        setNotes(prev => prev.filter(note => note.note_id !== selectedNoteId));
      }
      handleCloseDeleteDialog();
    }
  };

  const handleOpenEditModal = (note: any) => {
    setEditNoteData(note);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setEditNoteData(null);
  };

  const handleReloadNotes = async () => {
    const res = await getNotes();
    if (res) {
      // เรียง notes ตาม note_id จากน้อยไปมาก
      const sortedNotes = res.sort((a: any, b: any) => a.note_id - b.note_id);
      setNotes(sortedNotes);
    } else {
      console.error("Error fetching notes");
    }
  };

  useEffect(() => {
    handleReloadNotes();
  }, []);

  // กรองและเรียงข้อมูล
  const filteredNotes = notes
    .filter((note) =>
      note.title.toLowerCase().includes(searchText.toLowerCase()) ||
      note.description.toLowerCase().includes(searchText.toLowerCase()) ||
      note.status.toLowerCase().includes(searchText.toLowerCase()) ||
      note.user_id.toString().toLowerCase().includes(searchText.toLowerCase())
    );

  return (
    <div className="card my-5 shadow-md sm:rounded-lg bg-white border px-3 py-3">
      <div className="mynotes-1">My Notes</div>
      <TextField
        fullWidth
        label="Search notes..."
        variant="outlined"
        className="mb-4"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      <br /><br />
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="notes table">
            <TableHead>
              <TableRow>
                <TableCell><strong>No</strong></TableCell>
                <TableCell><strong>Title</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong className="flex items-center">Action <MdEditSquare size={20} className="ml-2 text-blue-500" /></strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNotes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((note, index) => (
                  <TableRow hover key={note.note_id}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>{note.title}</TableCell>
                    <TableCell>{note.description}</TableCell>
                    <TableCell>{note.status}</TableCell>
                    <TableCell>
                      <a
                        href="#"
                        className="text-blue-600 hover:underline mr-3"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenEditModal(note);
                        }}
                      >
                        <strong>Edit</strong>
                      </a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenDeleteDialog(note.note_id);
                        }}
                        className="text-red-600 hover:underline"
                      >
                        <strong>Delete</strong>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredNotes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this note? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      {openEditModal && editNoteData && (
        <ModalEdit
          open={openEditModal}
          onClose={handleCloseEditModal}
          noteId={editNoteData.note_id}
          initialValues={{
            title: editNoteData.title,
            description: editNoteData.description,
            picture: editNoteData.picture,
          }}
          onNoteUpdate={handleReloadNotes}
        />
      )}
    </div>
  );
};

export default Mypost;
