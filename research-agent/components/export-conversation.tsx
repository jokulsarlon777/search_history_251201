"use client";

import { useState } from "react";
import { Download, FileText, FileCode, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Message } from "@/lib/types";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportConversationProps {
  messages: Message[];
  threadTitle?: string;
}

export function ExportConversation({ messages, threadTitle = "대화" }: ExportConversationProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsMarkdown = () => {
    try {
      setIsExporting(true);

      let markdown = `# ${threadTitle}\n\n`;
      markdown += `생성일: ${new Date().toLocaleString('ko-KR')}\n\n`;
      markdown += `---\n\n`;

      messages.forEach((message, index) => {
        const role = message.role === "user" ? "👤 사용자" : "🤖 AI";
        markdown += `## ${role}\n\n`;
        markdown += `${message.content}\n\n`;

        if (message.timestamp) {
          markdown += `*${new Date(message.timestamp).toLocaleString('ko-KR')}*\n\n`;
        }

        if (index < messages.length - 1) {
          markdown += `---\n\n`;
        }
      });

      // UTF-8 BOM 추가로 Windows 메모장 등에서 한글 정상 표시
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${threadTitle}_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Markdown 파일로 내보내기 완료");
    } catch (error) {
      console.error("Markdown export error:", error);
      toast.error("Markdown 내보내기 실패");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsText = () => {
    try {
      setIsExporting(true);

      let text = `${threadTitle}\n`;
      text += `생성일: ${new Date().toLocaleString('ko-KR')}\n`;
      text += `${"=".repeat(60)}\n\n`;

      messages.forEach((message, index) => {
        const role = message.role === "user" ? "[사용자]" : "[AI]";
        text += `${role}\n`;
        text += `${message.content}\n`;

        if (message.timestamp) {
          text += `\n시간: ${new Date(message.timestamp).toLocaleString('ko-KR')}\n`;
        }

        if (index < messages.length - 1) {
          text += `\n${"-".repeat(60)}\n\n`;
        }
      });

      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${threadTitle}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("텍스트 파일로 내보내기 완료");
    } catch (error) {
      console.error("Text export error:", error);
      toast.error("텍스트 내보내기 실패");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    try {
      setIsExporting(true);
      toast.info("PDF 생성 중...", { description: "잠시만 기다려주세요" });

      // HTML 콘텐츠 생성 (한글 폰트 포함)
      const contentDiv = document.createElement("div");
      contentDiv.style.width = "800px";
      contentDiv.style.padding = "40px";
      contentDiv.style.backgroundColor = "white";
      contentDiv.style.fontFamily = "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
      contentDiv.style.position = "absolute";
      contentDiv.style.left = "-9999px";
      contentDiv.style.top = "0";

      // 제목
      const titleEl = document.createElement("h1");
      titleEl.textContent = threadTitle;
      titleEl.style.fontSize = "24px";
      titleEl.style.fontWeight = "bold";
      titleEl.style.marginBottom = "10px";
      titleEl.style.color = "#000";
      contentDiv.appendChild(titleEl);

      // 날짜
      const dateEl = document.createElement("p");
      dateEl.textContent = `생성일: ${new Date().toLocaleString('ko-KR')}`;
      dateEl.style.fontSize = "12px";
      dateEl.style.color = "#666";
      dateEl.style.marginBottom = "30px";
      contentDiv.appendChild(dateEl);

      // 구분선
      const hr1 = document.createElement("hr");
      hr1.style.border = "none";
      hr1.style.borderTop = "2px solid #ddd";
      hr1.style.marginBottom = "30px";
      contentDiv.appendChild(hr1);

      // 메시지
      messages.forEach((message, index) => {
        const messageDiv = document.createElement("div");
        messageDiv.style.marginBottom = "30px";

        // 역할
        const roleEl = document.createElement("div");
        roleEl.textContent = message.role === "user" ? "👤 사용자" : "🤖 AI";
        roleEl.style.fontSize = "14px";
        roleEl.style.fontWeight = "bold";
        roleEl.style.marginBottom = "8px";
        roleEl.style.color = message.role === "user" ? "#0066cc" : "#00aa00";
        messageDiv.appendChild(roleEl);

        // 내용
        const contentEl = document.createElement("div");
        contentEl.textContent = message.content;
        contentEl.style.fontSize = "12px";
        contentEl.style.lineHeight = "1.6";
        contentEl.style.color = "#000";
        contentEl.style.whiteSpace = "pre-wrap";
        contentEl.style.wordBreak = "break-word";
        messageDiv.appendChild(contentEl);

        // 타임스탬프
        if (message.timestamp) {
          const timeEl = document.createElement("div");
          timeEl.textContent = new Date(message.timestamp).toLocaleString('ko-KR');
          timeEl.style.fontSize = "10px";
          timeEl.style.color = "#999";
          timeEl.style.marginTop = "8px";
          messageDiv.appendChild(timeEl);
        }

        contentDiv.appendChild(messageDiv);

        // 구분선
        if (index < messages.length - 1) {
          const hr = document.createElement("hr");
          hr.style.border = "none";
          hr.style.borderTop = "1px solid #eee";
          hr.style.margin = "20px 0";
          contentDiv.appendChild(hr);
        }
      });

      // DOM에 추가
      document.body.appendChild(contentDiv);

      // Canvas로 변환 (고해상도로 한글 렌더링)
      const canvas = await html2canvas(contentDiv, {
        scale: 2, // 고해상도
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // DOM에서 제거
      document.body.removeChild(contentDiv);

      // PDF 생성
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // 첫 페이지 추가
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 여러 페이지로 나누기
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 저장
      pdf.save(`${threadTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF 파일로 내보내기 완료");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 내보내기 실패", {
        description: "문제가 지속되면 Markdown 형식을 사용해주세요"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={isExporting}
          className="rounded-full"
        >
          <Download className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportAsMarkdown} disabled={isExporting}>
          <FileCode className="mr-2 h-4 w-4" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsText} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          텍스트 (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF} disabled={isExporting}>
          <File className="mr-2 h-4 w-4" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
