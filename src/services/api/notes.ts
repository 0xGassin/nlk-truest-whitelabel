import type { ServerResponse } from "@/types";

import { apiClient } from "./client";

export interface NoteAuthor {
  avatar?: string;
  first_name: string;
  id: string;
  last_name: string;
}

export interface Note {
  author?: NoteAuthor;
  body: string;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: string;
  organization_id: string;
  updated_at: string;
}

const buildOrgPath = (orgId: string, path = "") =>
  `/api/v1/organizations/${orgId}${path}`;

const encodeEntityId = (entityType: string, entityId: string) =>
  `${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`;

export const notesService = {
  createNote: async (
    organizationId: string,
    entityType: string,
    entityId: string,
    body: string,
  ): Promise<Note> => {
    const response = await apiClient.post<ServerResponse<Note>>(
      buildOrgPath(organizationId, `/notes/${encodeEntityId(entityType, entityId)}`),
      { body },
    );
    return response.data.data!;
  },

  deleteNote: async (organizationId: string, noteId: string): Promise<void> => {
    await apiClient.delete(
      buildOrgPath(organizationId, `/notes/${encodeURIComponent(noteId)}`),
    );
  },

  getNotes: async (
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<Note[]> => {
    const response = await apiClient.get<ServerResponse<Note[]>>(
      buildOrgPath(organizationId, `/notes/${encodeEntityId(entityType, entityId)}`),
    );
    return response.data.data ?? [];
  },

  updateNote: async (
    organizationId: string,
    noteId: string,
    body: string,
  ): Promise<Note> => {
    const response = await apiClient.put<ServerResponse<Note>>(
      buildOrgPath(organizationId, `/notes/${encodeURIComponent(noteId)}`),
      { body },
    );
    return response.data.data!;
  },
};
