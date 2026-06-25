/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent } from "react";
import {
  Search,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Upload,
  MessageSquare,
  Compass,
  HelpCircle,
  Send,
  RefreshCw,
  CheckCircle,
  Calendar,
  User,
  Tag,
  Sparkles,
  Globe,
  Building2,
  Scale,
  X,
  ArrowRight,
  BookOpen,
  Info,
  Check,
  Split,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Document, ChatMessage, FolderNode, CompareResult } from "./types";

export default function App() {
  // Application States
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("doc-1");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"study" | "chat" | "compare">("study");
  
  // Chatbot states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Xin chào đồng chí! Tôi là Trợ lý Trí tuệ nhân tạo Bộ Ngoại giao. Tôi có thể giúp đồng chí đọc hiểu, tóm tắt, tra cứu nhanh thông tin hoặc đối chiếu lập trường giữa các tài liệu hành chính, tuyên bố chung và báo cáo đối ngoại. Đồng chí muốn bắt đầu nghiên cứu tài liệu nào?",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatScope, setChatScope] = useState<"single" | "custom" | "global">("single");
  const [selectedChatDocIds, setSelectedChatDocIds] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Compare states
  const [compareDocId1, setCompareDocId1] = useState<string>("doc-1");
  const [compareDocId2, setCompareDocId2] = useState<string>("doc-2");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Upload states
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadContent, setUploadContent] = useState<string>("");
  const [uploadAuthor, setUploadAuthor] = useState<string>("");
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>("");
  const [parsingFile, setParsingFile] = useState<boolean>(false);
  const [fileParseError, setFileParseError] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // UI state for folder expansion
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({
    "/Vụ Châu Mỹ": true,
    "/Vụ Đông Nam Á - Nam Á - Nam Thái Bình Dương": true,
    "/Vụ Châu Âu": false,
    "/Vụ Châu Phi - Trung Đông": false
  });

  // Fetch documents on load
  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
        setTree(data.tree);
        // Expand folders dynamically that contain documents
        const initialExpanded: { [key: string]: boolean } = {};
        data.tree.forEach((node: FolderNode) => {
          initialExpanded[node.path] = true;
          if (node.children) {
            node.children.forEach((subNode: FolderNode) => {
              initialExpanded[subNode.path] = true;
            });
          }
        });
        setExpandedFolders(initialExpanded);
      }
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu:", e);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Selected document data helper
  const selectedDoc = (documents || []).find((doc) => doc?.id === selectedDocId) || (documents || [])[0];

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Handle message send in chatbot
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setChatLoading(true);

    try {
      const payload = {
        question: currentInput,
        history: chatMessages.slice(-8).map(m => ({ sender: m.sender, text: m.text })),
        docId: chatScope === "single" ? selectedDocId : null,
        docIds: chatScope === "custom" ? selectedChatDocIds : null
      };

      const response = await fetch("/api/documents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          citations: data.citations || []
        };
        setChatMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.error || "Gặp lỗi khi tạo câu trả lời.");
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 2}`,
        sender: "assistant",
        text: `❌ Lỗi: ${err.message || "Không thể kết nối đến máy chủ AI."}`,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle document comparison
  const handleCompare = async () => {
    if (!compareDocId1 || !compareDocId2) return;
    setCompareLoading(true);
    setCompareResult(null);

    try {
      const response = await fetch("/api/documents/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId1: compareDocId1, docId2: compareDocId2 }),
      });

      const data = await response.json();
      if (response.ok) {
        setCompareResult(data);
      } else {
        alert(data.error || "Lỗi khi thực hiện so sánh đối chiếu.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ khi so sánh.");
    } finally {
      setCompareLoading(false);
    }
  };

  // Open Upload Modal with reset states
  const openUploadModal = () => {
    setUploadTitle("");
    setUploadContent("");
    setUploadAuthor("");
    setUploadedFileName("");
    setFileParseError("");
    setUploadSuccessMsg("");
    setIsUploadOpen(true);
  };

  // Handle file import (PDF, DOCX, TXT)
  const handleFileProcess = async (file: File) => {
    setParsingFile(true);
    setFileParseError("");
    setUploadedFileName(file.name);

    // Set temporary title from file name
    const rawTitle = file.name.replace(/\.[^/.]+$/, "");
    const cleanTitle = rawTitle.replace(/[-_]/g, " ");
    setUploadTitle(cleanTitle);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];

        const response = await fetch("/api/documents/parse-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64,
            fileName: file.name,
            fileType: file.type
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Không thể giải mã tệp tin này.");
        }

        if (data.text) {
          setUploadContent(data.text);
        }
        if (data.title) {
          setUploadTitle(data.title);
        }
      } catch (err: any) {
        console.error("Lỗi chuyển đổi tệp:", err);
        setFileParseError(err.message || "Lỗi trong quá trình trích xuất nội dung từ tệp tin.");
      } finally {
        setParsingFile(false);
      }
    };

    reader.onerror = () => {
      setFileParseError("Lỗi đọc tệp tin từ thiết bị.");
      setParsingFile(false);
    };

    reader.readAsDataURL(file);
  };

  // Handle document upload and auto-classification
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadContent.trim()) {
      alert("Vui lòng điền đầy đủ Tiêu đề và Nội dung tài liệu.");
      return;
    }

    setUploadLoading(true);
    setUploadSuccessMsg("");

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle,
          content: uploadContent,
          author: uploadAuthor || "Phòng Nghiên cứu",
          date: uploadDate
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents);
        setTree(data.tree);
        setSelectedDocId(data.document.id);
        setUploadSuccessMsg(`Tài liệu đã được phân loại tự động vào Vụ: "${data.document.department}" -> Loại: "${data.document.docType}" và lưu trữ thành công!`);
        
        // Auto-expand the newly created target path
        setExpandedFolders(prev => ({
          ...prev,
          [`/${data.document.department}`]: true,
          [`/${data.document.department}/${data.document.docType}`]: true
        }));

        // Reset Form
        setUploadTitle("");
        setUploadContent("");
        setUploadAuthor("");
        setUploadedFileName("");
        setFileParseError("");
        
        // Change to Study Tab to view results
        setActiveTab("study");
        setTimeout(() => {
          setIsUploadOpen(false);
          setUploadSuccessMsg("");
        }, 4000);
      } else {
        alert(data.error || "Tải tài liệu lên thất bại.");
      }
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra trong quá trình tải lên.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Filter documents based on search
  const filteredDocs = (documents || []).filter((doc) => {
    if (!doc) return false;
    const term = searchTerm.toLowerCase();
    return (
      (doc.title || "").toLowerCase().includes(term) ||
      (doc.content || "").toLowerCase().includes(term) ||
      (doc.department || "").toLowerCase().includes(term) ||
      (doc.tags || []).some(t => (t || "").toLowerCase().includes(term))
    );
  });

  // Render Folder Tree Nodes recursively
  const renderTreeNodes = (nodes: FolderNode[], depth = 0) => {
    return (nodes || []).map((node) => {
      const isExpanded = expandedFolders[node.path];
      const hasSearchMatch = searchTerm ? (documents || []).some(
        (doc) => 
          doc &&
          (doc.id === node.docId || node.path.includes(doc.department)) &&
          ((doc.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || (doc.tags || []).some(t => (t || "").toLowerCase().includes(searchTerm.toLowerCase())))
      ) : true;

      if (searchTerm && !hasSearchMatch && node.type === 'folder') {
        // Simple search pruning for folders
        const matchesInSubtree = node.children?.some(child => 
          child.type === 'document' ? 
            (documents || []).find(d => d?.id === child.docId)?.title?.toLowerCase().includes(searchTerm.toLowerCase()) :
            child.children?.some(subChild => (documents || []).find(d => d?.id === subChild.docId)?.title?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        if (!matchesInSubtree) return null;
      }

      if (node.type === "folder") {
        return (
          <div key={node.path} className="select-none">
            <button
              onClick={() => toggleFolder(node.path)}
              className="w-full flex items-center gap-2 py-1.5 px-2 hover:bg-slate-100 rounded text-sm text-slate-700 transition font-medium"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              id={`btn-folder-${node.path.replace(/\//g, "-")}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span className="truncate text-left">{node.name}</span>
            </button>
            {isExpanded && node.children && (
              <div className="mt-0.5">
                {renderTreeNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      } else {
        // Document Leaf Node
        const isSelected = selectedDocId === node.docId;
        return (
          <button
            key={node.path}
            onClick={() => {
              if (node.docId) {
                setSelectedDocId(node.docId);
                // Also set compare selections for easier comparison
                if (activeTab === "compare") {
                  if (compareDocId1 !== node.docId) {
                    setCompareDocId2(compareDocId1);
                    setCompareDocId1(node.docId);
                  }
                }
              }
            }}
            className={`w-full flex items-start gap-2 py-1.5 px-2 rounded text-xs transition text-left ${
              isSelected
                ? "bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600"
                : "hover:bg-slate-50 text-slate-600"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            id={`btn-doc-${node.docId}`}
          >
            <FileText className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
            <span className="line-clamp-2">{node.name}</span>
          </button>
        );
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      
      {/* 1. Header BNG */}
      <header className="bg-slate-900 text-white shadow-md relative z-20 border-b border-slate-800" id="bng-header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg border border-amber-500/30 text-amber-400 shadow-inner">
              <Globe className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">Hệ Thống Trợ Lý Trí Tuệ Nhân Tạo</span>
                <span className="px-1.5 py-0.2 bg-emerald-600/20 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/30">ONLINE</span>
              </div>
              <h1 className="text-lg md:text-xl font-display font-bold tracking-tight text-white flex items-center gap-1.5">
                TRỢ LÝ VĂN BẢN BỘ NGOẠI GIAO
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openUploadModal}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md active:scale-95"
              id="btn-trigger-upload"
            >
              <Upload className="h-4 w-4" />
              Tải Lên Văn Bản Mới
            </button>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600"></div>
      </header>

      {/* 3. Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch" id="main-workspace">
        
        {/* Left Side: Document Tree (4 cols) */}
        <aside className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[650px] lg:h-auto min-h-[500px]" id="sidebar-doc-tree">
          
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 uppercase font-display">
                <Building2 className="h-4 w-4 text-slate-700" />
                Cơ cấu Cây Tài Liệu BNG
              </h3>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                {documents.length} văn bản
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm tiêu đề, vụ, hoặc từ khóa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-xs pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Directory Tree Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1" id="tree-container">
            {tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                <RefreshCw className="h-8 w-8 animate-spin mb-2 text-slate-300" />
                <span className="text-xs">Đang nạp cấu trúc cây tài liệu Bộ...</span>
              </div>
            ) : (
              renderTreeNodes(tree)
            )}
          </div>

          {/* Quick Info Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-xl text-[10.5px] text-slate-500 shrink-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
              <span>Phân loại tự động theo <strong>Vụ khu vực & Chuyên đề</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></div>
              <span>Được hỗ trợ đọc hiểu bởi <strong>Gemini 3.5 AI</strong></span>
            </div>
          </div>
        </aside>

        {/* Right Side: Tab Workspace (8 cols) */}
        <main className="lg:col-span-8 flex flex-col" id="main-content-panel">
          
          {/* Navigation Tab Menu */}
          <div className="flex border-b border-slate-200 bg-white p-1 rounded-t-xl border-x border-t shrink-0">
            <button
              onClick={() => setActiveTab("study")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "study"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              id="tab-study-trigger"
            >
              <BookOpen className="h-4 w-4" />
              Nghiên Cứu & Tóm Tắt
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "chat"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              id="tab-chat-trigger"
            >
              <MessageSquare className="h-4 w-4" />
              Trợ Lý Hỏi Đáp Văn Bản
            </button>
            <button
              onClick={() => setActiveTab("compare")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "compare"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              id="tab-compare-trigger"
            >
              <Split className="h-4 w-4" />
              So Sánh & Đối Chiếu
            </button>
          </div>

          {/* Active Tab Viewport Area */}
          <div className="flex-1 bg-white border-x border-b rounded-b-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: STUDY & AI SUMMARY */}
              {activeTab === "study" && (
                <motion.div
                  key="study-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden h-[600px] lg:h-[650px]"
                >
                  {/* Left Column: Original Text (6 cols) */}
                  <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col overflow-hidden h-[300px] lg:h-full">
                    
                    {/* Header Metadata */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                          {selectedDoc?.department}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                          {selectedDoc?.docType}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {selectedDoc?.title}
                      </h2>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDoc?.author || "Bộ Ngoại Giao"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDoc?.date}
                        </span>
                      </div>
                    </div>

                    {/* Document Scroller */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-5 text-sm text-slate-700 leading-relaxed space-y-3 bg-white" id="doc-original-content">
                      {selectedDoc?.content.split("\n\n").map((paragraph, index) => (
                        <p key={index} className="indent-4 text-justify">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: AI Extraction (6 cols) */}
                  <div className="lg:col-span-6 flex flex-col overflow-y-auto h-[300px] lg:h-full bg-slate-50/50 p-4 md:p-5 space-y-4">
                    
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                      <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase font-display">
                        Phân Tích AI Thông Minh (Gemini 3.5)
                      </h3>
                    </div>

                    {/* 1. Auto Summary */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Tự động Tóm tắt thông tin
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100/50">
                        "{selectedDoc?.summary || "Đang tổng hợp tóm tắt..."}"
                      </p>
                    </div>

                    {/* 2. Key Takeaways */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Điểm cốt lõi đề xuất báo cáo lãnh đạo
                      </h4>
                      <ul className="space-y-2">
                        {selectedDoc?.keyPoints?.map((pt, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="flex-1">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 3. Entities Extracted */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Trích xuất dữ liệu quan trọng
                      </h4>

                      <div className="space-y-3">
                        {/* Countries */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            🌍 Các Quốc Gia/Vùng lãnh thổ
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDoc?.entities?.countries.length ? (
                              selectedDoc.entities.countries.map((c, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-[11px] font-medium border border-blue-100">
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Không tìm thấy</span>
                            )}
                          </div>
                        </div>

                        {/* People */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            👥 Nhân vật chủ chốt
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDoc?.entities?.people.length ? (
                              selectedDoc.entities.people.map((p, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px] font-medium border border-amber-100">
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Không có thông tin cá nhân cụ thể</span>
                            )}
                          </div>
                        </div>

                        {/* Events */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            📅 Sự kiện Ngoại giao
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDoc?.entities?.events.length ? (
                              selectedDoc.entities.events.map((e, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[11px] font-medium border border-emerald-100">
                                  {e}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Không phát hiện sự kiện cụ thể</span>
                            )}
                          </div>
                        </div>

                        {/* Agreements */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            📜 Thỏa thuận / Văn kiện liên kết
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDoc?.entities?.agreements.length ? (
                              selectedDoc.entities.agreements.map((a, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded text-[11px] font-medium border border-purple-100">
                                  {a}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Không có văn kiện pháp lý cụ thể</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tag list */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedDoc?.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 2: CHAT WITH DOCUMENTS */}
              {activeTab === "chat" && (
                <motion.div
                  key="chat-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col h-[600px] lg:h-[650px] overflow-hidden"
                >
                  {/* Chat Controls bar */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Ngữ cảnh hỏi đáp:</span>
                      <div className="bg-white border border-slate-300 rounded-lg p-0.5 flex">
                        <button
                          onClick={() => setChatScope("single")}
                          className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                            chatScope === "single"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Chỉ trong tài liệu này
                        </button>
                        <button
                          onClick={() => {
                            setChatScope("custom");
                            if (selectedChatDocIds.length === 0 && selectedDocId) {
                              setSelectedChatDocIds([selectedDocId]);
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                            chatScope === "custom"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Tùy chọn nhiều văn bản
                        </button>
                        <button
                          onClick={() => setChatScope("global")}
                          className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                            chatScope === "global"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Toàn bộ hệ thống BNG
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-sm">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        Tham chiếu: {
                          chatScope === "single"
                            ? `"${selectedDoc?.title}"`
                            : chatScope === "custom"
                            ? `${selectedChatDocIds.length} văn bản đã chọn`
                            : "Toàn bộ tài liệu ngoại giao"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Custom Document Selector Panel */}
                  {chatScope === "custom" && (
                    <div className="px-4 py-3 bg-blue-50/40 border-b border-slate-200 shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Lựa chọn các văn bản làm ngữ cảnh hỏi đáp ({selectedChatDocIds.length}/{documents.length}):</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedChatDocIds(documents.map(d => d.id))}
                            className="text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            Chọn tất cả
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedChatDocIds([])}
                            className="text-[10px] text-slate-600 hover:underline font-semibold"
                          >
                            Bỏ chọn tất cả
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                        {documents.map((doc) => {
                          const isSelected = selectedChatDocIds.includes(doc.id);
                          return (
                            <label
                              key={doc.id}
                              className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                                isSelected
                                  ? "bg-blue-50 border-blue-200 text-blue-900 shadow-2xs"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedChatDocIds((prev) =>
                                    prev.includes(doc.id)
                                      ? prev.filter((id) => id !== doc.id)
                                      : [...prev, doc.id]
                                  );
                                }}
                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold block truncate" title={doc.title}>
                                  {doc.title}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {doc.department} • {doc.docType}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" id="chat-messages-container">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3.5 shadow-xs ${
                            msg.sender === "user"
                              ? "bg-slate-900 text-white rounded-tr-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                          }`}
                        >
                          {/* Sender identification */}
                          <div className="flex items-center justify-between gap-4 mb-1.5 border-b border-slate-100 pb-1 text-[10px] font-bold tracking-wider">
                            <span className={msg.sender === "user" ? "text-slate-300" : "text-amber-600"}>
                              {msg.sender === "user" ? "ĐỒNG CHÍ NGHIÊN CỨU" : "TRỢ LÝ VĂN BẢN AI"}
                            </span>
                            <span className="text-slate-400 font-normal">{msg.timestamp}</span>
                          </div>

                          <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>

                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                              <span className="font-semibold">Nguồn đối chiếu:</span>
                              <ul className="list-disc pl-3 mt-0.5 space-y-0.5">
                                {msg.citations.map((cite, i) => (
                                  <li key={i} className="italic line-clamp-1">{cite}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-xs flex items-center gap-3">
                          <div className="flex space-x-1.5">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                          </div>
                          <span className="text-xs text-slate-500 italic">Trợ lý AI đang truy xuất dữ liệu đối chiếu và lập luận câu trả lời...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Quick prompts */}
                  <div className="px-4 py-2 border-t border-slate-200 bg-white flex flex-wrap gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-400 flex items-center font-bold uppercase tracking-wider mr-1">
                      Gợi ý câu hỏi nhanh:
                    </span>
                    <button
                      onClick={() => setChatInput("Tóm tắt nội dung chính của các văn bản này cho tôi.")}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition border border-slate-200"
                    >
                      💡 Tóm tắt văn bản
                    </button>
                    <button
                      onClick={() => setChatInput("Mục tiêu và các cam kết về chuỗi cung ứng bán dẫn là gì?")}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition border border-slate-200"
                    >
                      💡 Cam kết bán dẫn
                    </button>
                    <button
                      onClick={() => setChatInput("Vấn đề Biển Đông và UNCLOS 1982 được thể hiện như thế nào?")}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition border border-slate-200"
                    >
                      💡 Biển Đông & UNCLOS
                    </button>
                    <button
                      onClick={() => setChatInput("Các bước chỉ đạo cụ thể để bảo hộ công dân trong tình huống khẩn cấp?")}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition border border-slate-200"
                    >
                      💡 Phương án Bảo hộ công dân
                    </button>
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder={
                        chatScope === "single"
                          ? `Đặt câu hỏi về "${selectedDoc?.title}"...`
                          : chatScope === "custom"
                          ? selectedChatDocIds.length > 0
                            ? `Đặt câu hỏi đối chiếu ${selectedChatDocIds.length} văn bản đã chọn...`
                            : "Vui lòng chọn ít nhất 1 văn bản ở trên..."
                          : "Hỏi bất cứ thông tin gì trong hệ thống tài liệu..."
                      }
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={chatLoading || (chatScope === "custom" && selectedChatDocIds.length === 0)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim() || (chatScope === "custom" && selectedChatDocIds.length === 0)}
                      className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg transition shrink-0 disabled:opacity-40 active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* TAB 3: DOCUMENT COMPARISON */}
              {activeTab === "compare" && (
                <motion.div
                  key="compare-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col p-4 md:p-5 space-y-4 overflow-y-auto h-[600px] lg:h-[650px]"
                >
                  
                  {/* Selector Header */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-display">
                      <Split className="h-4 w-4 text-slate-700" />
                      Lựa chọn 2 tài liệu hành chính để đối chiếu lập trường
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document 1 Selector */}
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-500 uppercase">Tài liệu thứ nhất (Gốc đối chiếu)</label>
                        <select
                          value={compareDocId1}
                          onChange={(e) => setCompareDocId1(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {documents.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              [{doc.department}] - {doc.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Document 2 Selector */}
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-500 uppercase">Tài liệu thứ hai (Đối chứng)</label>
                        <select
                          value={compareDocId2}
                          onChange={(e) => setCompareDocId2(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {documents.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              [{doc.department}] - {doc.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleCompare}
                        disabled={compareLoading || compareDocId1 === compareDocId2}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
                      >
                        {compareLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Đang xử lý đối chiếu chuyên sâu...
                          </>
                        ) : (
                          <>
                            <Compass className="h-4 w-4 text-amber-400" />
                            Khởi Chạy Đối Chiếu AI
                          </>
                        )}
                      </button>
                    </div>

                    {compareDocId1 === compareDocId2 && (
                      <div className="text-[11px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Hãy chọn 2 văn bản khác nhau để đối chiếu kết quả tốt nhất.</span>
                      </div>
                    )}
                  </div>

                  {/* Results Display */}
                  {compareLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 space-y-3 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-800 animate-spin"></div>
                        <Sparkles className="absolute -top-1.5 -right-1.5 h-5 w-5 text-amber-500 animate-bounce" />
                      </div>
                      <div className="text-center space-y-1 max-w-md">
                        <p className="text-sm font-bold text-slate-800">Trí tuệ nhân tạo đang tiến hành rà soát song song...</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Gemini 3.5 đang so khớp cấu trúc, tìm kiếm điểm tương đồng về mặt từ vựng chính trị, đánh giá mức độ trùng lặp lợi ích quốc gia và phân tích các khác biệt lập trường chiến lược của từng văn bản.
                        </p>
                      </div>
                    </div>
                  )}

                  {!compareLoading && compareResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.99 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                      id="compare-results-dashboard"
                    >
                      {/* Comparison Title */}
                      <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg border border-slate-800 text-center">
                        <h4 className="text-xs font-bold tracking-widest text-amber-400 uppercase">KẾT QUẢ ĐỐI CHIẾU SONG PHƯƠNG CHUYÊN SÂU</h4>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                          {compareResult.title1} <span className="text-amber-400 font-bold">vs</span> {compareResult.title2}
                        </p>
                      </div>

                      {/* Summary text */}
                      <div className="bg-emerald-50/30 p-3.5 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">Tóm tắt đối chiếu chung:</span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {compareResult.summary}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Common Ground */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm"></span>
                            Điểm song trùng lợi ích / Tương đồng
                          </h4>
                          <ul className="space-y-2">
                            {compareResult.commonGround.map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Differences */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm"></span>
                            Khác biệt về định hướng / Trọng tâm
                          </h4>
                          <ul className="space-y-2">
                            {compareResult.differences.map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="text-amber-600 font-bold shrink-0 mt-0.5">✦</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Strategic implications */}
                      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-2 shadow-inner">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          Hàm ý chính sách & Khuyến nghị tham mưu
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed text-justify">
                          {compareResult.diplomaticImplications}
                        </p>
                      </div>

                    </motion.div>
                  )}

                  {!compareLoading && !compareResult && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Split className="h-10 w-10 text-slate-300" />
                      <p className="text-xs font-medium">Chọn hai văn bản cần đối chiếu lập trường từ biểu mẫu phía trên và ấn nút Khởi chạy đối chiếu.</p>
                      <p className="text-[10px] text-slate-400 max-w-sm">Hệ thống sẽ đối chứng lập trường đối ngoại, mục tiêu chính sách và tham mưu hàm ý đối ngoại phù hợp.</p>
                    </div>
                  )}

                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* 4. MODAL: UPLOAD NEW DOCUMENT & AUTO-CLASSIFY */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
              id="upload-modal-container"
            >
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm md:text-base font-display">Tải lên & Phân loại văn bản tự động bằng AI</h3>
                    <p className="text-[10px] text-slate-400">Hệ thống tự nhận diện phòng ban Vụ và loại tài liệu hành chính</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUploadSubmit} className="p-4 md:p-5 space-y-4 flex-1 overflow-y-auto">
                {uploadSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex items-start gap-2 animate-pulse">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{uploadSuccessMsg}</span>
                  </div>
                )}

                {/* Drag and Drop Zone for PDF, DOCX, TXT */}
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-600 uppercase flex items-center justify-between">
                    <span>Tải tệp tin tài liệu (Khuyên dùng)</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-normal px-2 py-0.5 rounded-full">PDF, DOCX, TXT</span>
                  </label>
                  
                  <div
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition relative ${
                      parsingFile
                        ? "border-amber-300 bg-amber-50/20 animate-pulse"
                        : fileParseError
                        ? "border-rose-300 bg-rose-50/20"
                        : uploadedFileName
                        ? "border-emerald-300 bg-emerald-50/20"
                        : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50"
                    }`}
                  >
                    {parsingFile ? (
                      <div className="flex flex-col items-center justify-center py-2 space-y-2">
                        <RefreshCw className="h-6 w-6 text-amber-500 animate-spin" />
                        <div className="text-xs font-semibold text-amber-800">Đang trích xuất nội dung từ tệp "{uploadedFileName}"...</div>
                        <div className="text-[10px] text-slate-500">Hệ thống đang tự động chuyển đổi sang định dạng văn bản gốc</div>
                      </div>
                    ) : fileParseError ? (
                      <div className="flex flex-col items-center justify-center py-1 space-y-2">
                        <AlertCircle className="h-6 w-6 text-rose-500" />
                        <div className="text-xs font-semibold text-rose-800">{fileParseError}</div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFileParseError("");
                              setUploadedFileName("");
                            }}
                            className="text-[10px] bg-white border border-rose-300 text-rose-700 px-2.5 py-1 rounded-md font-semibold hover:bg-rose-50"
                          >
                            Thử tệp khác
                          </button>
                        </div>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex flex-col items-center justify-center py-1 space-y-2">
                        <div className="flex items-center gap-1.5 bg-emerald-100/80 border border-emerald-200 text-emerald-950 px-3 py-1 rounded-full text-xs font-medium">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <span>Đã giải mã: {uploadedFileName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Nội dung đã được trích xuất vào khung soạn thảo phía dưới. Bạn có thể bổ sung thông tin trước khi hoàn tất.</div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFileName("");
                            setUploadTitle("");
                            setUploadContent("");
                          }}
                          className="text-[10px] text-slate-600 hover:text-slate-900 underline font-medium"
                        >
                          Xóa tệp / Chọn tệp khác
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 space-y-1.5 cursor-pointer">
                        <div className="p-2 bg-slate-100 rounded-full text-slate-600 transition">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-semibold text-slate-700">Kéo thả tệp tin hoặc click để tải lên</div>
                        <div className="text-[10px] text-slate-400">Chấp nhận định dạng .pdf, .docx, .txt (Tối đa 50MB)</div>
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileProcess(file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10.5px] font-bold text-slate-600 uppercase">Tiêu đề tài liệu / Văn bản ngoại giao*</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Tuyên bố chung nâng cấp quan hệ Việt Nam - Nhật Bản..."
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      disabled={uploadLoading}
                      className="w-full bg-white text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-600 uppercase">Ngày ban hành / Lập tài liệu</label>
                    <input
                      type="date"
                      value={uploadDate}
                      onChange={(e) => setUploadDate(e.target.value)}
                      disabled={uploadLoading}
                      className="w-full bg-white text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Proposed Unit / Author */}
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-600 uppercase">Tác giả / Cơ quan dự thảo đề xuất</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Cục Ngoại vụ / Vụ Đông Bắc Á"
                      value={uploadAuthor}
                      onChange={(e) => setUploadAuthor(e.target.value)}
                      disabled={uploadLoading}
                      className="w-full bg-white text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-slate-600 uppercase">Nội dung chi tiết tài liệu*</label>
                    <span className="text-[10px] text-slate-400 italic">Hỗ trợ dán toàn bộ văn bản gốc</span>
                  </div>
                  <textarea
                    required
                    rows={8}
                    placeholder="Dán nội dung tài liệu ngoại giao, tuyên bố, thông báo báo chí hoặc nội dung báo cáo nghiên cứu vào đây..."
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    disabled={uploadLoading}
                    className="w-full bg-white text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Guidance / Alert */}
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 flex items-start gap-2 text-[10.5px] text-slate-600 leading-relaxed">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Định tuyến tự động:</strong> Mô hình AI của chúng tôi sẽ tự động phân tích ngữ cảnh của văn bản để chỉ định Vụ quản lý (ví dụ: Vụ Châu Âu cho văn bản liên quan đến EU, Vụ Châu Mỹ cho văn bản liên quan đến Mỹ, v.v.) và phân loại loại tài liệu chính xác, giúp tổ chức hệ thống ngăn nắp.
                  </span>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    disabled={uploadLoading}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        AI đang đọc, tóm tắt và phân loại...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Lưu Trữ & Phân Loại Bằng AI
                      </>
                    )}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-4 text-xs border-t border-slate-800 mt-auto shrink-0" id="bng-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Bản quyền thuộc Cục Công nghệ Thông tin - Bộ Ngoại Giao Việt Nam</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">Môi trường Chuyên Dùng</span>
            <span>Phiên bản 3.5-Flash</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
