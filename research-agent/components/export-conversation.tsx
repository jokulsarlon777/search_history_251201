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

      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
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

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Configure PDF
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(threadTitle, margin, yPosition);
      yPosition += lineHeight * 2;

      // Date
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`생성일: ${new Date().toLocaleString('ko-KR')}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // Messages
      messages.forEach((message, index) => {
        // Check if need new page
        if (yPosition > pageHeight - margin * 2) {
          pdf.addPage();
          yPosition = margin;
        }

        // Role
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        const role = message.role === "user" ? "[사용자]" : "[AI]";
        pdf.text(role, margin, yPosition);
        yPosition += lineHeight;

        // Content
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        // Split content into lines that fit the page width
        const lines = pdf.splitTextToSize(message.content, pageWidth - margin * 2);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin * 2) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });

        // Timestamp
        if (message.timestamp) {
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(new Date(message.timestamp).toLocaleString('ko-KR'), margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += lineHeight;
        }

        // Separator
        if (index < messages.length - 1) {
          yPosition += lineHeight * 0.5;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += lineHeight * 1.5;
        }
      });

      // Save PDF
      pdf.save(`${threadTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF 파일로 내보내기 완료");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 내보내기 실패");
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
