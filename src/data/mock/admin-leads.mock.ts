import type {
  AdminAdvisor,
  AdminConversation,
  ClientProfile,
  LeadNote,
  LeadTimelineEvent,
} from "@/types/admin-lead";
import { getMockMessages } from "./leads.mock";

export const ADMIN_ADVISORS_MOCK: AdminAdvisor[] = [
  { id: "adv-001", name: "María López", avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=3&w=80&h=80&q=80" },
  { id: "adv-002", name: "Laura Torres" },
  { id: "adv-003", name: "Andrea Ruiz" },
  { id: "adv-004", name: "Carolina Díaz" },
  { id: "adv-005", name: "Paula Gómez" },
  { id: "adv-006", name: "Sofía Hernández" },
];

export const ADMIN_CONVERSATIONS_MOCK: AdminConversation[] = [
  { id: "c1", customerName: "Juan Sebastián Pérez", phone: "300 123 4567", rut: "10.123.456-7", lastMessage: "Gracias, me gustaría saber más sobre los planes", lastMessageTime: "3:25 p. m.", unread: 2, status: "contactado", online: true, assignedAdvisor: ADMIN_ADVISORS_MOCK[0] },
  { id: "c2", customerName: "María Fernanda Gómez", phone: "300 234 5678", rut: "12.345.678-9", lastMessage: "¿Tienen planes para portabilidad?", lastMessageTime: "3:18 p. m.", unread: 1, status: "nuevo", online: true, assignedAdvisor: null },
  { id: "c3", customerName: "Andrés Felipe Ramírez", phone: "300 345 6789", rut: "9.876.543-2", lastMessage: "Perfecto, muchas gracias.", lastMessageTime: "3:10 p. m.", unread: 0, status: "convertido", online: false, assignedAdvisor: ADMIN_ADVISORS_MOCK[2] },
  { id: "c4", customerName: "Laura Camila Díaz", phone: "300 456 7890", rut: "11.222.333-4", lastMessage: "Me interesa la oferta de internet hogar", lastMessageTime: "2:45 p. m.", unread: 0, status: "negociacion", online: false, assignedAdvisor: ADMIN_ADVISORS_MOCK[1] },
  { id: "c5", customerName: "Carlos Eduardo Torres", phone: "300 567 8901", rut: "13.444.555-6", lastMessage: "¿Pueden ayudarme con una factura?", lastMessageTime: "2:30 p. m.", unread: 0, status: "asignado", online: true, assignedAdvisor: ADMIN_ADVISORS_MOCK[3] },
  { id: "c6", customerName: "Valentina Morales", phone: "300 678 9012", rut: "14.555.666-7", lastMessage: "Quiero información de un plan familiar", lastMessageTime: "1:58 p. m.", unread: 0, status: "nuevo", online: false, assignedAdvisor: null },
  { id: "c7", customerName: "Diego Alejandro Ruiz", phone: "300 789 0123", rut: "15.666.777-8", lastMessage: "Listo, quedo atento. Gracias", lastMessageTime: "1:40 p. m.", unread: 0, status: "perdido", online: false, assignedAdvisor: ADMIN_ADVISORS_MOCK[4] },
  { id: "c8", customerName: "Sofía Hernández", phone: "300 890 1234", rut: "16.777.888-9", lastMessage: "¿Cuáles son los requisitos?", lastMessageTime: "12:22 p. m.", unread: 0, status: "contactado", online: true, assignedAdvisor: ADMIN_ADVISORS_MOCK[0] },
  { id: "c9", customerName: "Miguel Ángel Castro", phone: "300 901 2345", rut: "17.888.999-0", lastMessage: "Gracias por tu ayuda.", lastMessageTime: "11:45 a. m.", unread: 0, status: "convertido", online: false, assignedAdvisor: ADMIN_ADVISORS_MOCK[5] },
];

export const LEAD_NOTES_MOCK: LeadNote[] = [
  { id: "n1", conversationId: "c1", text: "Cliente interesado en portabilidad M. Enviar cotización.", createdAt: "2025-08-03T15:20:00", author: "María López" },
  { id: "n2", conversationId: "c1", text: "Tiene deuda pendiente con operador actual — verificar elegibilidad.", createdAt: "2025-08-03T14:10:00", author: "Supervisor" },
  { id: "n3", conversationId: "c4", text: "Prefiere fibra 300MB. Llamar mañana AM.", createdAt: "2025-08-03T12:00:00", author: "Laura Torres" },
];

export const CLIENT_PROFILES_MOCK: Record<string, ClientProfile> = {
  c1: { salesCount: 1, linesCount: 2, firstContact: "15/07/2025", lastPurchase: "28/07/2025", currentStatus: "En negociación" },
  c3: { salesCount: 2, linesCount: 3, firstContact: "02/06/2025", lastPurchase: "01/08/2025", currentStatus: "Convertido" },
  c4: { salesCount: 0, linesCount: 0, firstContact: "03/08/2025", lastPurchase: null, currentStatus: "En negociación" },
};

export function getDefaultClientProfile(conversationId: string): ClientProfile {
  return (
    CLIENT_PROFILES_MOCK[conversationId] ?? {
      salesCount: 0,
      linesCount: 0,
      firstContact: "03/08/2025",
      lastPurchase: null,
      currentStatus: "Nuevo",
    }
  );
}

export function buildTimeline(conversationId: string): LeadTimelineEvent[] {
  const conv = ADMIN_CONVERSATIONS_MOCK.find((c) => c.id === conversationId);
  if (!conv) return [];
  const events: LeadTimelineEvent[] = [
    { id: `${conversationId}-t1`, conversationId, type: "message", title: "Conversación iniciada", detail: "El cliente escribió por WhatsApp", at: "03/08/2025 10:00", user: "Sistema" },
  ];
  if (conv.assignedAdvisor) {
    events.push({
      id: `${conversationId}-t2`,
      conversationId,
      type: "assignment",
      title: "Asignación de asesora",
      detail: `Asignado a ${conv.assignedAdvisor.name}`,
      at: "03/08/2025 10:15",
      user: "Admin",
    });
  }
  events.push({
    id: `${conversationId}-t3`,
    conversationId,
    type: "status_change",
    title: "Cambio de estado",
    detail: `Estado: ${conv.status}`,
    at: "03/08/2025 14:30",
    user: conv.assignedAdvisor?.name ?? "Sistema",
  });
  for (const note of LEAD_NOTES_MOCK.filter((n) => n.conversationId === conversationId)) {
    events.push({
      id: note.id,
      conversationId,
      type: "note",
      title: "Nota interna",
      detail: note.text,
      at: note.createdAt,
      user: note.author,
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export { getMockMessages };
