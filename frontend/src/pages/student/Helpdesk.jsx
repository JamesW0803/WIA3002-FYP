import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  MessageSquare,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const HelpdeskPage = () => {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [newTicket, setNewTicket] = useState({
    title: "",
    category: "",
    description: "",
  });
  const [newNote, setNewNote] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const ticketsPerPage = 5;

  useEffect(() => {
    // Fetch tickets from backend (mocked here)
    const fetchTickets = async () => {
      // Replace this with API call
      const allTickets = [
        {
          id: 1,
          title: "Login issues",
          status: "new",
          category: "Authentication",
          date: "2025-05-18",
          description: "Unable to login with student credentials",
          notes: [
            {
              id: 1,
              text: "Reported by student ID 12345",
              date: "2025-05-18 10:30",
              author: "System",
            },
            {
              id: 2,
              text: "Looking into authentication server logs",
              date: "2025-05-18 11:15",
              author: "Admin",
            },
          ],
        },
        {
          id: 2,
          title: "Course enrollment error",
          status: "in-progress",
          category: "Registration",
          date: "2025-05-17",
          description: "Error when trying to enroll in CSC301",
          notes: [
            {
              id: 1,
              text: "Student reported prerequisite requirements not being recognized",
              date: "2025-05-17 14:20",
              author: "System",
            },
          ],
        },
        {
          id: 3,
          title: "Grade display issue",
          status: "completed",
          category: "Grades",
          date: "2025-05-16",
          description: "Final grades not appearing on dashboard",
          notes: [
            {
              id: 1,
              text: "Issue with grade sync from LMS",
              date: "2025-05-16 09:45",
              author: "System",
            },
            {
              id: 2,
              text: "Fixed in backend update v2.4.1",
              date: "2025-05-16 16:30",
              author: "Tech Support",
            },
          ],
        },
      ];
      setTickets(allTickets);
    };
    fetchTickets();
  }, []);

  const Badge = ({
    variant = "default",
    className = "",
    children,
    ...props
  }) => {
    const baseClasses =
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

    const variantClasses = {
      default: "bg-blue-100 text-blue-800 border-transparent",
      destructive: "bg-red-100 text-red-800 border-transparent",
      warning: "bg-yellow-100 text-yellow-800 border-transparent",
      success: "bg-green-100 text-green-800 border-transparent",
      outline: "border-gray-300 text-gray-700",
    }[variant];

    return (
      <span
        className={`${baseClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  };

  const handleCreateTicket = () => {
    const newId =
      tickets.length > 0 ? Math.max(...tickets.map((t) => t.id)) + 1 : 1;
    const ticket = {
      id: newId,
      ...newTicket,
      status: "new",
      date: new Date().toISOString().split("T")[0],
      notes: [
        {
          id: 1,
          text: `Ticket created: ${newTicket.description.substring(0, 50)}...`,
          date: new Date().toISOString(),
          author: "User",
        },
      ],
    };
    setTickets([ticket, ...tickets]);
    setNewTicket({ title: "", category: "", description: "" });
    setShowCreateForm(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedTicket) return;

    const updatedTickets = tickets.map((ticket) => {
      if (ticket.id === selectedTicket.id) {
        const newNoteId =
          ticket.notes.length > 0
            ? Math.max(...ticket.notes.map((n) => n.id)) + 1
            : 1;
        return {
          ...ticket,
          notes: [
            ...ticket.notes,
            {
              id: newNoteId,
              text: newNote,
              date: new Date().toISOString(),
              author: "Staff", // This would normally be the logged-in user
            },
          ],
        };
      }
      return ticket;
    });

    setTickets(updatedTickets);
    setNewNote("");
    setSelectedTicket(updatedTickets.find((t) => t.id === selectedTicket.id));
  };

  const updateTicketStatus = (ticketId, newStatus) => {
    const updatedTickets = tickets.map((ticket) => {
      if (ticket.id === ticketId) {
        return { ...ticket, status: newStatus };
      }
      return ticket;
    });
    setTickets(updatedTickets);
  };

  const filteredTickets =
    statusFilter === "all"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const currentTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "new":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> New
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" /> In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Helpdesk Support</h1>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          className="flex items-center gap-1"
        >
          All Tickets
        </Button>
        <Button
          variant={statusFilter === "new" ? "default" : "outline"}
          onClick={() => setStatusFilter("new")}
          className="flex items-center gap-1"
        >
          <AlertCircle className="h-4 w-4" />
          New
        </Button>
        <Button
          variant={statusFilter === "in-progress" ? "default" : "outline"}
          onClick={() => setStatusFilter("in-progress")}
          className="flex items-center gap-1"
        >
          <Clock className="h-4 w-4" />
          In Progress
        </Button>
        <Button
          variant={statusFilter === "completed" ? "default" : "outline"}
          onClick={() => setStatusFilter("completed")}
          className="flex items-center gap-1"
        >
          <CheckCircle className="h-4 w-4" />
          Completed
        </Button>
        <Button
          className="ml-auto flex items-center gap-1"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Create Ticket Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4 p-6">
            <h3 className="font-semibold">Create New Ticket</h3>
            <Input
              placeholder="Title*"
              value={newTicket.title}
              onChange={(e) =>
                setNewTicket({ ...newTicket, title: e.target.value })
              }
            />
            <Input
              placeholder="Category* (e.g., Technical, Academic, Financial)"
              value={newTicket.category}
              onChange={(e) =>
                setNewTicket({ ...newTicket, category: e.target.value })
              }
            />
            <Textarea
              placeholder="Description*"
              value={newTicket.description}
              onChange={(e) =>
                setNewTicket({ ...newTicket, description: e.target.value })
              }
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateTicket}>Submit Ticket</Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {currentTickets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No tickets found with the current filters
            </CardContent>
          </Card>
        ) : (
          currentTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTicket?.id === ticket.id
                  ? "border-blue-500 border-2"
                  : ""
              }`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{ticket.title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {ticket.description.substring(0, 100)}
                      {ticket.description.length > 100 ? "..." : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(ticket.status)}
                    <Badge variant="outline">{ticket.category}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="text-xs text-gray-500">
                    #{ticket.id} • {ticket.date} • {ticket.notes.length} notes
                  </div>
                  <div className="flex gap-2">
                    {ticket.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTicketStatus(
                            ticket.id,
                            ticket.status === "new"
                              ? "in-progress"
                              : "completed"
                          );
                        }}
                      >
                        {ticket.status === "new"
                          ? "Start Progress"
                          : "Mark Complete"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Details Sidebar */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedTicket.title}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTicket(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {getStatusBadge(selectedTicket.status)}
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                  <span className="text-sm text-gray-500">
                    #{selectedTicket.id} • {selectedTicket.date}
                  </span>
                </div>
                <p className="text-gray-700">{selectedTicket.description}</p>
              </div>

              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Notes
                </h3>
                <div className="space-y-4 mb-4">
                  {selectedTicket.notes.map((note) => (
                    <div
                      key={note.id}
                      className="border-l-2 border-blue-500 pl-3"
                    >
                      <div className="text-sm text-gray-700">{note.text}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(note.date).toLocaleString()} • {note.author}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddNote}>Add Note</Button>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedTicket.status !== "completed" && (
                  <Button
                    onClick={() =>
                      updateTicketStatus(
                        selectedTicket.id,
                        selectedTicket.status === "new"
                          ? "in-progress"
                          : "completed"
                      )
                    }
                  >
                    {selectedTicket.status === "new"
                      ? "Start Progress"
                      : "Mark as Completed"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default HelpdeskPage;
