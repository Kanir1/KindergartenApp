// src/api/requiredItems.js
import api from './client';

export async function getLatestRequiredItems(childId) {
  const { data } = await api.get(`/required-items/latest/${childId}`);
  return data; // null or { _id, items, createdAt, readBy: [...] }
}

export async function markLatestRequiredItemsRead(childId) {
  await api.post(`/required-items/latest/${childId}/read`);
}

export async function createRequiredItems(payload) {
  // payload: { child, items: {diapers, wetWipes, clothing, other} }
  const { data } = await api.post('/required-items', payload);
  return data;
}
