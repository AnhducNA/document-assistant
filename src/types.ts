/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  department: string; // e.g. "Vụ Đông Bắc Á", "Vụ Châu Âu", etc.
  docType: string; // e.g. "Báo cáo nhanh", "Tuyên bố chung", "Công văn"
  date: string;
  summary?: string;
  keyPoints?: string[];
  entities?: {
    countries: string[];
    people: string[];
    events: string[];
    agreements: string[];
  };
  tags: string[];
  author?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: string[];
}

export interface FolderNode {
  name: string;
  type: 'folder' | 'document';
  path: string;
  docId?: string; // If type is 'document'
  children?: FolderNode[];
}

export interface CompareResult {
  title1: string;
  title2: string;
  commonGround: string[];
  differences: string[];
  diplomaticImplications: string;
  summary: string;
}
