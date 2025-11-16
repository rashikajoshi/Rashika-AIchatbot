import { tool } from "ai";
import { z } from "zod";
import { readDocument } from "@/lib/pinecone";

export const readNotebookLecture = tool({
    description: 'Read a lecture notebook and return the content of the lecture',
    inputSchema: z.object({
        hypothetical_document: z.string(),
    }),
    execute: async ({ hypothetical_document }) => {
        return await readDocument('lecture_notebook', hypothetical_document);
    },
});