import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Plan } from "@/types/lead";

export const PLANS_MOCK: Plan[] = [
  { id: "xs", name: "Plan XS" },
  { id: "s", name: "Plan S" },
  { id: "m", name: "Plan M" },
  { id: "l", name: "Plan L" },
  { id: "xl", name: "Plan XL" },
  { id: "fibra", name: "Fibra Hogar" },
  { id: "prepago", name: "Prepago" },
  { id: "postpago", name: "Postpago" },
];

export const CONVERSATIONS_MOCK: Conversation[] = [
  { id: "c1", customerName: "Juan Sebastián Pérez", phone: "300 123 4567", rut: "10.123.456-7", lastMessage: "Gracias, me gustaría saber más sobre los planes", lastMessageTime: "3:25 p. m.", unread: 2, status: "in_progress", online: true },
  { id: "c2", customerName: "María Fernanda Gómez", phone: "300 234 5678", rut: "12.345.678-9", lastMessage: "¿Tienen planes para portabilidad?", lastMessageTime: "3:18 p. m.", unread: 1, status: "new", online: true },
  { id: "c3", customerName: "Andrés Felipe Ramírez", phone: "300 345 6789", rut: "9.876.543-2", lastMessage: "Perfecto, muchas gracias.", lastMessageTime: "3:10 p. m.", unread: 0, status: "converted", online: false },
  { id: "c4", customerName: "Laura Camila Díaz", phone: "300 456 7890", rut: "11.222.333-4", lastMessage: "Me interesa la oferta de internet hogar", lastMessageTime: "2:45 p. m.", unread: 0, status: "in_progress", online: false },
  { id: "c5", customerName: "Carlos Eduardo Torres", phone: "300 567 8901", rut: "13.444.555-6", lastMessage: "¿Pueden ayudarme con una factura?", lastMessageTime: "2:30 p. m.", unread: 0, status: "new", online: true },
  { id: "c6", customerName: "Valentina Morales", phone: "300 678 9012", rut: "14.555.666-7", lastMessage: "Quiero información de un plan familiar", lastMessageTime: "1:58 p. m.", unread: 0, status: "new", online: false },
  { id: "c7", customerName: "Diego Alejandro Ruiz", phone: "300 789 0123", rut: "15.666.777-8", lastMessage: "Listo, quedo atento. Gracias", lastMessageTime: "1:40 p. m.", unread: 0, status: "lost", online: false },
  { id: "c8", customerName: "Sofía Hernández", phone: "300 890 1234", rut: "16.777.888-9", lastMessage: "¿Cuáles son los requisitos?", lastMessageTime: "12:22 p. m.", unread: 0, status: "in_progress", online: true },
  { id: "c9", customerName: "Miguel Ángel Castro", phone: "300 901 2345", rut: "17.888.999-0", lastMessage: "Gracias por tu ayuda.", lastMessageTime: "11:45 a. m.", unread: 0, status: "converted", online: false },
];

const CONVERSATION_C1_MESSAGES: ChatMessage[] = [
  { id: "m1", conversationId: "c1", text: "Hola, buenas tardes", time: "3:21 p. m.", direction: "in" },
  { id: "m2", conversationId: "c1", text: "Quisiera información sobre los planes", time: "3:22 p. m.", direction: "in" },
  { id: "m3", conversationId: "c1", text: "¡Hola! 👋 Gracias por escribirnos.", time: "3:22 p. m.", direction: "out", read: true },
  { id: "m4", conversationId: "c1", text: "Con gusto, te cuento nuestras opciones disponibles.", time: "3:23 p. m.", direction: "out", read: true },
  { id: "m5", conversationId: "c1", text: "Perfecto, me interesa saber más", time: "3:24 p. m.", direction: "in" },
  { id: "m6", conversationId: "c1", text: "Te comparto los detalles de nuestros planes y beneficios.", time: "3:24 p. m.", direction: "out", read: true },
  {
    id: "m7",
    conversationId: "c1",
    text: "",
    time: "3:25 p. m.",
    direction: "out",
    read: true,
    link: {
      title: "Planes DuMo",
      description: "Conoce nuestros planes y escoge el que mejor se adapte a ti.",
      url: "https://dumo.com/planes",
    },
  },
];

/** Messages keyed by conversation id. Falls back to a generic thread. */
export const MESSAGES_MOCK: Record<string, ChatMessage[]> = {
  c1: CONVERSATION_C1_MESSAGES,
};

export function getMockMessages(conversationId: string): ChatMessage[] {
  return (
    MESSAGES_MOCK[conversationId] ?? [
      { id: `${conversationId}-1`, conversationId, text: "Hola, buenas tardes 👋", time: "10:00 a. m.", direction: "in" },
      { id: `${conversationId}-2`, conversationId, text: "¡Hola! Gracias por escribirnos. ¿En qué te podemos ayudar?", time: "10:01 a. m.", direction: "out", read: true },
    ]
  );
}
