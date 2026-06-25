/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
// @ts-ignore
import pdf from "pdf-parse";
import mammoth from "mammoth";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Robust model wrapper with automatic fallbacks for high load / demand (e.g. 503 error)
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini API] Đang thử yêu cầu với model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response) {
        console.log(`[Gemini API] Thành công bằng model: ${model}`);
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Lỗi model ${model}:`, err.message || err);
      lastError = err;
      // If error is 503 or others, try next model in loop
    }
  }

  // If all failed, throw a readable error
  throw new Error(
    `Hệ thống AI hiện đang chịu tải cao (503 Service Unavailable). Xin vui lòng thử lại sau vài giây. Chi tiết lỗi: ${lastError?.message || lastError}`
  );
}

// Mock Database of Ministry of Foreign Affairs Documents (Vietnamese)
let documents = [
  {
    id: "doc-1",
    title: "Tuyên bố chung Việt Nam - Hoa Kỳ về nâng cấp quan hệ lên Đối tác Chiến lược Toàn diện",
    department: "Vụ Châu Mỹ",
    docType: "Tuyên bố chung",
    date: "2023-09-11",
    author: "Tổ Công tác Đối ngoại Mỹ",
    tags: ["Việt-Mỹ", "Đối tác Chiến lược Toàn diện", "Thương mại", "Bán dẫn"],
    content: `TUYÊN BỐ CHUNG VỀ NÂNG CẤP QUAN HỆ VIỆT NAM - HOA KỲ LÊN ĐỐI TÁC CHIẾN LƯỢC TOÀN DIỆN
Vì Hòa bình, Hợp tác và Phát triển Bền vững

Nhận lời mời của Tổng Bí thư Ban Chấp hành Trung ương Đảng Cộng sản Việt Nam Nguyễn Phú Trọng, Tổng thống Hợp chủng quốc Hoa Kỳ Joseph R. Biden Jr. đã có chuyến thăm cấp Nhà nước tới Việt Nam từ ngày 10-11 tháng 9 năm 2023.

Hai bên đánh giá cao bước phát triển vượt bậc trong quan hệ song phương kể từ khi bình thường hóa quan hệ (1995) và thiết lập quan hệ Đối tác Toàn diện (2013). Trên cơ sở đó, Tổng Bí thư Nguyễn Phú Trọng và Tổng thống Joe Biden đã tuyên bố nâng cấp quan hệ hai nước lên tầm Đối tác Chiến lược Toàn diện.

Các trụ cột hợp tác chính bao gồm:
1. Chính trị và Ngoại giao: Tăng cường trao đổi đoàn cấp cao, tôn trọng độc lập, chủ quyền, toàn vẹn lãnh thổ và thể chế chính trị của nhau. Hoa Kỳ ủng hộ một Việt Nam mạnh, độc lập, tự cường và thịnh vượng.
2. Kinh tế, Thương mại và Đầu tư: Thúc đẩy chuỗi cung ứng tự cường, phát triển hạ tầng số, và dỡ bỏ các rào cản thương mại phi lý. Hoa Kỳ cam kết hỗ trợ Việt Nam tham gia sâu hơn vào chuỗi giá trị toàn cầu.
3. Hợp tác Khoa học, Công nghệ và Đổi mới Sáng tạo: Trọng tâm là xây dựng hệ sinh thái bán dẫn và phát triển nguồn nhân lực chất lượng cao trong lĩnh vực công nghệ cao. Hoa Kỳ sẽ cấp các khoản hỗ trợ ban đầu để khởi động sáng kiến đào tạo nhân lực bán dẫn tại Việt Nam.
4. Giáo dục và Đào tạo: Mở rộng các chương trình trao đổi giáo dục, tăng cường vai trò của Đại học Fulbright Việt Nam và mở rộng cấp học bổng cho học sinh sinh viên Việt Nam sang Hoa Kỳ nghiên cứu.
5. Biển Đông và An ninh khu vực: Tái khẳng định tầm quan trọng của việc duy trì hòa bình, ổn định, tự do hàng hải, hàng không tại Biển Đông. Giải quyết hòa bình các tranh chấp trên cơ sở luật pháp quốc tế, đặc biệt là UNCLOS 1982.`,
    summary: "Tuyên bố chung Việt Nam - Hoa Kỳ năm 2023 chính thức nâng cấp quan hệ song phương lên Đối tác Chiến lược Toàn diện, mở ra các định hướng hợp tác sâu sắc về chính trị, kinh tế, thương mại, an ninh và đặc biệt là công nghệ cao, bao gồm hệ sinh thái bán dẫn và chuỗi cung ứng bền vững.",
    keyPoints: [
      "Nâng cấp quan hệ hai nước lên tầm Đối tác Chiến lược Toàn diện vì hòa bình, hợp tác và phát triển bền vững.",
      "Mỹ ủng hộ một nước Việt Nam mạnh, độc lập, tự cường và thịnh vượng.",
      "Tập trung hợp tác phát triển hệ sinh thái bán dẫn và đào tạo nhân lực công nghệ cao tại Việt Nam.",
      "Tái khẳng định cam kết duy trì hòa bình, an ninh và tự do hàng hải ở Biển Đông dựa trên luật pháp quốc tế UNCLOS 1982."
    ],
    entities: {
      countries: ["Việt Nam", "Hoa Kỳ"],
      people: ["Nguyễn Phú Trọng", "Joseph R. Biden Jr."],
      events: ["Chuyến thăm cấp Nhà nước của Tổng thống Mỹ tới Việt Nam năm 2023"],
      agreements: ["Tuyên bố chung Đối tác Chiến lược Toàn diện"]
    }
  },
  {
    id: "doc-2",
    title: "Báo cáo nhanh kết quả Hội nghị Thượng đỉnh ASEAN lần thứ 44-45 tại Lào",
    department: "Vụ Đông Nam Á - Nam Á - Nam Thái Bình Dương",
    docType: "Báo cáo nhanh",
    date: "2024-10-12",
    author: "Phòng ASEAN",
    tags: ["ASEAN", "Hội nghị Thượng đỉnh", "Liên kết khu vực", "Biển Đông"],
    content: `BÁO CÁO NHANH KẾT QUẢ HỘI NGHỊ THƯỢNG ĐỈNH ASEAN LẦN THỨ 44 VÀ 45
Vientiane, Cộng hòa Dân chủ Nhân dân Lào, Tháng 10 năm 2024

Hội nghị Thượng đỉnh ASEAN lần thứ 44 và 45 cùng các Hội nghị cấp cao liên quan đã diễn ra thành công tốt đẹp dưới sự chủ trì của nước Chủ tịch Lào 2024. Đoàn Việt Nam do Thủ tướng Chính phủ Phạm Minh Chính dẫn đầu đã tham dự và đóng góp nhiều sáng kiến thực chất.

Các nội dung trọng tâm đạt được:
1. Đẩy mạnh liên kết kinh tế và hạ tầng số: ASEAN thông qua lộ trình hoàn tất đàm phán nâng cấp Hiệp định Thương mại hàng hóa ASEAN (ATIGA), xúc tiến khuôn khổ Kinh tế số ASEAN (DEFA) nhằm mục tiêu đóng góp thêm 2.000 tỷ USD cho kinh tế khu vực vào năm 2030.
2. Ứng phó biến đổi khí hậu và chuyển đổi năng lượng: Đạt được sự đồng thuận cao về Chiến lược ASEAN trung hòa carbon và đầu tư lưới điện truyền tải liên bang để hỗ trợ phân phối năng lượng tái tạo.
3. Vấn đề Biển Đông: Hội nghị dành thời gian thảo luận sâu sắc về tình hình phức tạp ở Biển Đông. Các nhà lãnh đạo bày tỏ lo ngại về các hành vi đơn phương, làm thay đổi nguyên trạng và gia tăng căng thẳng. ASEAN nhấn mạnh nguyên tắc tự kiềm chế, thực hiện đầy đủ DOC và thúc đẩy đàm phán COC thực chất, hiệu lực, phù hợp với UNCLOS 1982.
4. Tình hình Myanmar: Tái khẳng định Đồng thuận 5 điểm (5PC) là khuôn khổ chủ đạo giúp Myanmar tìm giải pháp chính trị hòa bình bền vững. Ủng hộ các nỗ lực nhân đạo của Đặc phái viên Chủ tịch ASEAN.

Thủ tướng Phạm Minh Chính đã có bài phát biểu quan trọng, đề xuất ASEAN cần tăng cường tính tự cường, thúc đẩy tự chủ chiến lược, đồng thời tăng cường kết nối hạ tầng giao thông và hạ tầng số xuyên biên giới để giữ vững vai trò trung tâm của khối.`,
    summary: "Báo cáo tổng kết kết quả Hội nghị Thượng đỉnh ASEAN lần thứ 44-45 tại Lào, tập trung thúc đẩy liên kết kinh tế số (DEFA), hợp tác năng lượng xanh, và thảo luận lập trường nhất quán về vấn đề Biển Đông cũng như giải pháp cho khủng hoảng Myanmar.",
    keyPoints: [
      "Thúc đẩy Hiệp định Kinh tế Số ASEAN (DEFA) nhằm gia tăng quy mô kinh tế vùng lên mức đột phá.",
      "Tăng cường kết nối mạng lưới lưới điện liên bang ASEAN để phân phối năng lượng tái tạo.",
      "Tuyên bố lập trường chung của khối về Biển Đông: yêu cầu thượng tôn pháp luật và UNCLOS 1982.",
      "Duy trì Đồng thuận 5 điểm trong việc hỗ trợ giải quyết hòa bình xung đột tại Myanmar."
    ],
    entities: {
      countries: ["Lào", "Việt Nam", "Myanmar", "Các nước thành viên ASEAN"],
      people: ["Phạm Minh Chính"],
      events: ["Hội nghị Thượng đỉnh ASEAN lần thứ 44-45 tại Vientiane"],
      agreements: ["Khuôn khổ Kinh tế số ASEAN (DEFA)", "Đồng thuận 5 điểm (5PC) về Myanmar"]
    }
  },
  {
    id: "doc-3",
    title: "Báo cáo Ngoại giao Kinh tế: Đẩy mạnh xuất khẩu nông sản Việt Nam sang EU dưới tác động của Hiệp định EVFTA",
    department: "Vụ Châu Âu",
    docType: "Báo cáo nhanh",
    date: "2025-03-20",
    author: "Tổ Nghiên cứu EVFTA",
    tags: ["EVFTA", "Xuất khẩu nông sản", "Ngoại giao kinh tế", "Thị trường EU"],
    content: `BÁO CÁO CHUYÊN ĐỀ NGOẠI GIAO KINH TẾ
Đẩy mạnh xuất khẩu nông sản Việt Nam sang EU dưới tác động của EVFTA trong giai đoạn mới

Báo cáo phân tích hiệu quả thực thi Hiệp định Thương mại Tự do Việt Nam - EU (EVFTA) sau 5 năm đi vào hiệu lực và đề xuất các giải pháp ngoại giao hỗ trợ doanh nghiệp vượt qua rào cản kỹ thuật ngày càng khắt khe của EU.

Nội dung chính:
1. Đánh giá thành tựu xuất khẩu: Nông sản Việt Nam (bao gồm thủy sản, cà phê, hạt điều, gạo chất lượng cao) ghi nhận mức tăng trưởng xuất khẩu trung bình 15-18% mỗi năm sang các thị trường lớn như Đức, Pháp, Hà Lan, Italy. Thuế quan ưu đãi giúp nông sản Việt Nam có lợi thế cạnh tranh vượt trội so với các đối thủ trong khu vực.
2. Các thách thức và rào cản mới (Rào cản xanh):
   - Quy định chống mất rừng của EU (EUDR): Các sản phẩm như cà phê, gỗ phải chứng minh không có nguồn gốc từ đất rừng bị tàn phá sau năm 2020.
   - Tiêu chuẩn vệ sinh dịch tễ (SPS) và giới hạn dư lượng thuốc bảo vệ thực vật (MRLs) ngày càng siết chặt.
   - Cơ chế điều chỉnh biên giới carbon (CBAM) bắt đầu áp dụng thí điểm tác động gián tiếp đến logistics và đóng gói nông sản.
3. Khuyến nghị giải pháp Ngoại giao Kinh tế:
   - Các cơ quan đại diện Việt Nam tại EU cần tăng cường công tác cảnh báo sớm về các quy định kỹ thuật mới của EU để doanh nghiệp kịp thích ứng.
   - Thúc đẩy đàm phán công nhận lẫn nhau về quy trình kiểm dịch, an toàn thực phẩm.
   - Tổ chức các chương trình xúc tiến thương mại chuyên đề, định vị thương hiệu 'Nông nghiệp xanh - Bền vững' cho sản phẩm Việt Nam tại thị trường Châu Âu.`,
    summary: "Báo cáo Ngoại giao Kinh tế phân tích sự tăng trưởng nông sản xuất khẩu sang EU nhờ EVFTA, cảnh báo về các rào cản xanh mới của EU như luật chống phá rừng (EUDR) và quy định CBAM, từ đó đưa ra các đề xuất hành động cho cơ quan ngoại giao.",
    keyPoints: [
      "Xuất khẩu nông sản Việt Nam tăng trưởng vượt bậc từ 15-18%/năm nhờ ưu đãi thuế quan từ EVFTA.",
      "EU đang áp đặt các rào cản kỹ thuật rất ngặt nghèo về môi trường như EUDR (chống phá rừng) và CBAM.",
      "Đề xuất các Đại sứ quán Việt Nam tại EU lập cơ chế cảnh báo sớm chính sách và tiêu chuẩn mới để hỗ trợ nông dân nội địa.",
      "Định vị thương hiệu nông sản Việt Nam theo tiêu chuẩn sinh thái, bền vững."
    ],
    entities: {
      countries: ["Việt Nam", "Liên minh Châu Âu (EU)", "Đức", "Pháp", "Hà Lan", "Italy"],
      people: [],
      events: ["Thực thi Hiệp định EVFTA sau 5 năm"],
      agreements: ["Hiệp định Thương mại Tự do Việt Nam - EU (EVFTA)", "Quy định chống mất rừng EU (EUDR)"]
    }
  },
  {
    id: "doc-4",
    title: "Công văn chỉ đạo về việc tăng cường công tác bảo hộ công dân Việt Nam tại khu vực Trung Đông",
    department: "Vụ Châu Phi - Trung Đông",
    docType: "Công văn",
    date: "2026-05-15",
    author: "Cục Lãnh sự phối hợp Vụ Trung Đông",
    tags: ["Bảo hộ công dân", "Xung đột Trung Đông", "An ninh công dân", "Khẩn cấp"],
    content: `BỘ NGOẠI GIAO - CỤC LÃNH SỰ
V/v: Tăng cường công tác theo dõi, bảo hộ công dân Việt Nam tại các địa bàn xảy ra xung đột ở Trung Đông

Kính gửi: Các Cơ quan đại diện Ngoại giao Việt Nam tại khu vực Trung Đông (Saudi Arabia, Ai Cập, Israel, Iran, Lebanon, UAE).

Trước tình hình căng thẳng địa chính trị leo thang nghiêm trọng tại khu vực Trung Đông, đe dọa an toàn tính mạng và tài sản của công dân Việt Nam đang sinh sống, học tập và làm việc tại khu vực, Bộ Ngoại giao chỉ đạo các Cơ quan đại diện thực hiện ngay các công việc khẩn cấp sau:

1. Rà soát thông tin công dân: Phối hợp chặt chẽ với các hội đoàn người Việt, doanh nghiệp xuất khẩu lao động để cập nhật danh sách, số điện thoại, địa chỉ và đầu mối liên lạc khẩn cấp của toàn bộ công dân Việt Nam trên địa bàn.
2. Xây dựng phương án sơ tán khẩn cấp: Lập tức cập nhật các kịch bản sơ tán công dân khi xung đột lan rộng. Xác định rõ các tuyến đường di tản (đường hàng không hoặc đường bộ qua nước láng giềng an toàn), điểm tập kết và liên hệ trước với chính quyền sở tại để tạo thuận lợi tối đa về thủ tục xuất nhập cảnh.
3. Duy trì đường dây nóng 24/7: Thiết lập trạng trực ban lãnh sự liên tục, sẵn sàng tiếp nhận thông tin yêu cầu cứu hộ cứu nạn từ công dân. Kịp thời hướng dẫn người dân các biện pháp trú ẩn an toàn, tránh xa các khu vực chiến sự hoặc mục tiêu quân sự nguy hiểm.
4. Báo cáo định kỳ: Định kỳ báo cáo tình hình về Bộ Ngoại giao (qua Cục Lãnh sự và Vụ Châu Phi - Trung Đông) vào 16h00 hàng ngày hoặc báo cáo đột xuất ngay khi có sự việc khẩn cấp phát sinh liên quan đến an toàn của công dân Việt Nam.`,
    summary: "Công văn khẩn cấp của Bộ Ngoại giao gửi các cơ quan đại diện tại Trung Đông, yêu cầu triển khai gấp 4 nhiệm vụ trọng tâm: rà soát danh sách công dân, lên phương án di tản phòng ngừa, túc trực đường dây nóng cứu hộ, và báo cáo cập nhật hàng ngày trong bối cảnh xung đột leo thang.",
    keyPoints: [
      "Chỉ đạo khẩn cấp rà soát toàn diện và giữ liên lạc liên tục với cộng đồng người Việt tại vùng căng thẳng Trung Đông.",
      "Yêu cầu lên sẵn kịch bản sơ tán dân bằng cả đường hàng không và đường bộ qua biên giới nước thứ ba.",
      "Duy trì các đường dây nóng trực lãnh sự 24/7 phục vụ công tác cứu trợ kịp thời.",
      "Thực hiện cơ chế báo cáo nhanh định kỳ hàng ngày về Bộ Ngoại giao."
    ],
    entities: {
      countries: ["Việt Nam", "Saudi Arabia", "Ai Cập", "Israel", "Iran", "Lebanon", "UAE"],
      people: [],
      events: ["Căng thẳng địa chính trị leo thang tại khu vực Trung Đông năm 2026"],
      agreements: ["Kế hoạch Bảo hộ công dân khẩn cấp của Bộ Ngoại giao"]
    }
  }
];

// Helper to construct the document tree based on department and docType
function buildDocumentTree(docsList: typeof documents) {
  const departments: { [key: string]: { [key: string]: string[] } } = {};

  docsList.forEach((doc) => {
    if (!departments[doc.department]) {
      departments[doc.department] = {};
    }
    if (!departments[doc.department][doc.docType]) {
      departments[doc.department][doc.docType] = [];
    }
    departments[doc.department][doc.docType].push(doc.id);
  });

  const tree: any[] = [];
  Object.keys(departments).forEach((deptName) => {
    const deptNode: any = {
      name: deptName,
      type: "folder",
      path: `/${deptName}`,
      children: [],
    };

    Object.keys(departments[deptName]).forEach((typeName) => {
      const typeNode: any = {
        name: typeName,
        type: "folder",
        path: `/${deptName}/${typeName}`,
        children: [],
      };

      departments[deptName][typeName].forEach((docId) => {
        const doc = docsList.find((d) => d.id === docId);
        if (doc) {
          typeNode.children.push({
            name: doc.title,
            type: "document",
            path: `/${deptName}/${typeName}/${doc.id}`,
            docId: doc.id,
          });
        }
      });

      deptNode.children.push(typeNode);
    });

    tree.push(deptNode);
  });

  return tree;
}

// Helper to extract text from PDF, DOCX, or text files in base64
async function extractTextFromBase64(base64Data: string, fileName: string, fileType: string): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (fileType === "application/pdf" || ext === "pdf") {
    const data = await pdf(buffer);
    return data.text || "";
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } else {
    return buffer.toString("utf8");
  }
}

// 1. Get list of all documents
app.get("/api/documents", (req, res) => {
  res.json({
    documents,
    tree: buildDocumentTree(documents),
  });
});

// Parse PDF/DOCX on the fly and return text
app.post("/api/documents/parse-file", async (req, res) => {
  const { base64Data, fileName, fileType } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: "Dữ liệu tệp tin không hợp lệ." });
  }

  try {
    const text = await extractTextFromBase64(base64Data, fileName || "document.txt", fileType || "");
    const cleanText = text.trim();
    if (!cleanText) {
      return res.status(400).json({ error: "Không tìm thấy nội dung văn bản trong tệp tin hoặc tệp tin rỗng." });
    }
    
    let proposedTitle = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Tài liệu mới";
    proposedTitle = proposedTitle.replace(/[-_]/g, " ");

    res.json({
      text: cleanText,
      title: proposedTitle
    });
  } catch (error: any) {
    console.error("Lỗi parse tệp tin:", error);
    res.status(500).json({ error: `Không thể giải mã hoặc chuyển đổi tệp tin này: ${error.message || error}` });
  }
});

// 2. Upload and Auto-Classify a new document using Gemini
app.post("/api/documents/upload", async (req, res) => {
  const { title, content, author, date } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Tiêu đề và Nội dung tài liệu là bắt buộc." });
  }

  try {
    const documentDate = date || new Date().toISOString().split("T")[0];
    const documentAuthor = author || "Người dùng đóng góp";

    // Call Gemini to classify, summarize, and extract data
    const prompt = `Bạn là một chuyên gia phân tích tài liệu hành chính và ngoại giao tại Bộ Ngoại giao Việt Nam.
Hãy phân tích tài liệu sau và trả về thông tin phân tích dưới dạng JSON.

Nội dung tài liệu:
---
Tiêu đề: ${title}
Nội dung: ${content}
---

Hãy phân loại tài liệu vào đúng Đơn vị phòng ban (Vụ) và Loại tài liệu của Bộ Ngoại giao.
Lựa chọn phòng ban (department) phù hợp nhất trong danh sách sau, hoặc đề xuất phòng ban phù hợp nếu không có trong danh sách:
- Vụ Châu Mỹ
- Vụ Châu Âu
- Vụ Đông Bắc Á
- Vụ Đông Nam Á - Nam Á - Nam Thái Bình Dương
- Vụ Châu Phi - Trung Đông
- Vụ các Tổ chức Quốc tế
- Vụ Hợp tác Kinh tế Đa phương
- Vụ Luật pháp và Điều ước Quốc tế
- Văn phòng Bộ

Lựa chọn loại tài liệu (docType) phù hợp nhất trong danh sách sau:
- Báo cáo nhanh
- Công văn
- Tuyên bố chung
- Đề án Ngoại giao
- Điểm tin Ngoại giao

Ngoài ra, hãy tóm tắt ngắn gọn tài liệu, trích xuất 3-4 điểm cốt lõi (key points), và trích xuất các thực thể quan trọng bao gồm: Các quốc gia liên quan, Nhân vật liên quan, Sự kiện ngoại giao liên quan, và Các văn kiện/thỏa thuận được nhắc tới.

Hãy trả về kết quả định dạng JSON chuẩn với cấu trúc sau:
{
  "department": "Tên Vụ đã phân loại",
  "docType": "Loại tài liệu",
  "summary": "Tóm tắt khoảng 2-3 câu bằng tiếng Việt",
  "keyPoints": ["Điểm cốt lõi 1", "Điểm cốt lõi 2", "Điểm cốt lõi 3", "Điểm cốt lõi 4"],
  "tags": ["tag1", "tag2", "tag3"],
  "entities": {
    "countries": ["Quốc gia 1", "Quốc gia 2"],
    "people": ["Tên người 1", "Tên người 2"],
    "events": ["Sự kiện 1", "Sự kiện 2"],
    "agreements": ["Thỏa thuận 1", "Thỏa thuận 2"]
  }
}
Lưu ý: Chỉ trả về định dạng JSON thuần túy, không có thẻ bao ngoài kiểu \`\`\`json hay bất cứ text thừa nào khác.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    let analysisResult: any = {};
    try {
      analysisResult = JSON.parse(resultText.trim());
    } catch (e) {
      console.error("Lỗi parse JSON từ Gemini:", e);
      // Fallback
      analysisResult = {
        department: "Văn phòng Bộ",
        docType: "Báo cáo nhanh",
        summary: "Tài liệu được tải lên bởi người dùng.",
        keyPoints: ["Tài liệu chưa được trích xuất tự động thành công."],
        tags: ["Tài liệu mới"],
        entities: { countries: [], people: [], events: [], agreements: [] }
      };
    }

    const newDoc = {
      id: `doc-${Date.now()}`,
      title,
      content,
      department: analysisResult.department || "Văn phòng Bộ",
      docType: analysisResult.docType || "Báo cáo nhanh",
      date: documentDate,
      author: documentAuthor,
      summary: analysisResult.summary || "Không có tóm tắt.",
      keyPoints: analysisResult.keyPoints || [],
      entities: analysisResult.entities || { countries: [], people: [], events: [], agreements: [] },
      tags: analysisResult.tags || ["Mới tải lên"],
    };

    documents.push(newDoc);

    res.json({
      message: "Tài liệu đã được tải lên và phân loại tự động thành công!",
      document: newDoc,
      tree: buildDocumentTree(documents),
    });
  } catch (error) {
    console.error("Lỗi khi tải tài liệu:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Đã xảy ra lỗi hệ thống." });
  }
});

// 3. Ask Q&A about document(s)
app.post("/api/documents/chat", async (req, res) => {
  const { question, history, docId, docIds } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Câu hỏi không được để trống." });
  }

  try {
    let context = "";
    let citations: string[] = [];

    if (docIds && Array.isArray(docIds) && docIds.length > 0) {
      context = `Hệ thống cơ sở dữ liệu Bộ Ngoại giao - Các tài liệu do người dùng lựa chọn để đối chiếu và tham chiếu:\n\n`;
      docIds.forEach((id, idx) => {
        const doc = documents.find((d) => d.id === id);
        if (doc) {
          context += `[Tài liệu ${idx + 1}] Tiêu đề: ${doc.title}\nVụ phụ trách: ${doc.department}\nLoại văn bản: ${doc.docType}\nNội dung: ${doc.content}\n\n`;
          citations.push(doc.title);
        }
      });
    } else if (docId) {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        context = `Tài liệu đang chọn để tham chiếu:
Tiêu đề: ${doc.title}
Vụ phụ trách: ${doc.department}
Loại văn bản: ${doc.docType}
Nội dung: ${doc.content}`;
        citations.push(doc.title);
      }
    } else {
      // Search across all documents
      context = `Hệ thống cơ sở dữ liệu của Bộ Ngoại giao gồm có các tài liệu sau:\n\n`;
      documents.forEach((doc, idx) => {
        context += `[Tài liệu ${idx + 1}] Tiêu đề: ${doc.title}\nPhòng ban: ${doc.department}\nNội dung: ${doc.content.substring(0, 1000)}...\n\n`;
      });
    }

    const chatHistoryPrompt = history && history.length > 0
      ? `Lịch sử hội thoại trước đó:\n${history.map((h: any) => `${h.sender === "user" ? "Người hỏi" : "Trợ lý"}: ${h.text}`).join("\n")}\n`
      : "";

    const systemPrompt = `Bạn là Trợ lý Văn bản Ngoại giao thông minh trực thuộc Bộ Ngoại giao Việt Nam.
Nhiệm vụ của bạn là hỗ trợ cán bộ nghiên cứu tài liệu, giải đáp câu hỏi và tổng hợp thông tin nhanh để báo cáo lãnh đạo một cách cực kỳ chính xác, ngắn gọn, có cấu trúc chặt chẽ (sử dụng gạch đầu dòng, tiêu đề phụ nếu cần).

Dưới đây là ngữ cảnh tài liệu bạn có quyền truy cập để trả lời câu hỏi:
===
${context}
===

${chatHistoryPrompt}
Hãy trả lời câu hỏi mới của người dùng dưới đây dựa trên dữ liệu ngữ cảnh trên.
- Chỉ đưa ra các thông tin có căn cứ trong tài liệu được cung cấp. Nếu thông tin không có trong tài liệu, hãy lịch sự thông báo là "Thông tin này hiện chưa có trong cơ sở tài liệu của hệ thống, tuy nhiên tôi có thể giải thích theo kiến thức ngoại giao chung..." và phân biệt rõ phần trả lời ngoài tài liệu.
- Giữ giọng điệu hành chính ngoại giao lịch sự, trang trọng, khách quan.
- Trả lời bằng tiếng Việt.

Câu hỏi: ${question}`;

    const response = await generateContentWithFallback({
      contents: systemPrompt,
    });

    res.json({
      answer: response.text || "Không thể trả lời câu hỏi này.",
      citations,
    });
  } catch (error) {
    console.error("Lỗi khi hỏi đáp:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo câu trả lời." });
  }
});

// 4. Compare two documents side-by-side using Gemini
app.post("/api/documents/compare", async (req, res) => {
  const { docId1, docId2 } = req.body;

  if (!docId1 || !docId2) {
    return res.status(400).json({ error: "Cần chọn cả hai tài liệu để tiến hành so sánh." });
  }

  try {
    const doc1 = documents.find((d) => d.id === docId1);
    const doc2 = documents.find((d) => d.id === docId2);

    if (!doc1 || !doc2) {
      return res.status(404).json({ error: "Không tìm thấy tài liệu yêu cầu." });
    }

    const prompt = `Bạn là Chuyên gia Nghiên cứu Chính sách Ngoại giao xuất sắc của Bộ Ngoại giao Việt Nam.
Hãy thực hiện một so sánh, phân tích chi tiết và chuyên sâu giữa hai văn bản dưới đây để chuẩn bị nội dung báo cáo lãnh đạo.

Văn bản 1:
- Tiêu đề: ${doc1.title}
- Đơn vị: ${doc1.department}
- Loại: ${doc1.docType}
- Ngày ban hành: ${doc1.date}
- Nội dung: ${doc1.content}

Văn bản 2:
- Tiêu đề: ${doc2.title}
- Đơn vị: ${doc2.department}
- Loại: ${doc2.docType}
- Ngày ban hành: ${doc2.date}
- Nội dung: ${doc2.content}

Hãy tạo một báo cáo so sánh dưới định dạng JSON với các trường thông tin sau:
1. commonGround: Danh sách các điểm tương đồng, sự nhất quán về mặt lập trường, hoặc các mặt hợp tác song trùng lợi ích giữa hai văn bản (dạng mảng các chuỗi).
2. differences: Danh sách các điểm khác biệt lớn về trọng tâm, phương pháp triển khai, đối tượng tác động hoặc địa bàn áp dụng (dạng mảng các chuỗi).
3. diplomaticImplications: Đánh giá hàm ý ngoại giao hoặc ý nghĩa chiến lược của hai văn bản này đối với công tác tham mưu chính sách của Việt Nam (đoạn văn phân tích sâu sắc tầm 4-5 câu).
4. summary: Tóm tắt so sánh chung nhất (2-3 câu).

Hãy trả về định dạng JSON thuần túy, không có thẻ bao ngoài kiểu \`\`\`json hay bất cứ text thừa nào khác.
Cấu trúc JSON yêu cầu:
{
  "commonGround": ["Điểm tương đồng 1", "Điểm tương đồng 2", ...],
  "differences": ["Điểm khác biệt 1", "Điểm khác biệt 2", ...],
  "diplomaticImplications": "Nội dung đánh giá chuyên sâu...",
  "summary": "Nội dung tóm tắt so sánh chung..."
}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    let compareResult = {};
    try {
      compareResult = JSON.parse(resultText.trim());
    } catch (e) {
      console.error("Lỗi parse so sánh JSON:", e);
      compareResult = {
        commonGround: ["Hai tài liệu đều phục vụ công tác đối ngoại và nghiên cứu chính sách."],
        differences: ["Mỗi tài liệu có một địa bàn và trọng tâm chủ đề riêng biệt."],
        diplomaticImplications: "Cần tiếp tục nghiên cứu sâu thêm để làm rõ mối liên hệ giữa các địa bàn.",
        summary: "Báo cáo so sánh tự động gặp lỗi định dạng, vui lòng thử lại.",
      };
    }

    res.json({
      title1: doc1.title,
      title2: doc2.title,
      ...compareResult,
    });
  } catch (error) {
    console.error("Lỗi khi so sánh tài liệu:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Lỗi hệ thống khi thực hiện so sánh." });
  }
});

// Configure Vite or Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
