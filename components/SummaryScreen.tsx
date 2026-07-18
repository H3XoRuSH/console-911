import React, { useState, useEffect } from 'react';
import { HydratedCallSession } from '@/lib/hydration';
import { LeaderboardEntry, TranscriptMessage, FeedbackInfo } from '@/types/game';
import { showToast } from '@/lib/toast';

const getThemeColors = (themeName: string) => {
  switch (themeName) {
    case 'amber':
      return { bg: '#090500', text: '#f59e0b', textDim: '#b45309', border: '#78350f', accent: '#f59e0b' };
    case 'cyan':
      return { bg: '#00080d', text: '#06b6d4', textDim: '#0369a1', border: '#0e7490', accent: '#06b6d4' };
    case 'silver':
      return { bg: '#09090b', text: '#d4d4d8', textDim: '#71717a', border: '#3f3f46', accent: '#fafafa' };
    case 'paper':
      return { bg: '#f5f5f4', text: '#1c1917', textDim: '#78716c', border: '#d6d3d1', accent: '#000000' };
    case 'lab':
      return { bg: '#f0fdfa', text: '#0f766e', textDim: '#0d9488', border: '#99f6e4', accent: '#115e59' };
    case 'green':
    default:
      return { bg: '#000a05', text: '#10b981', textDim: '#047857', border: '#065f46', accent: '#34d399' };
  }
};

interface SummaryScreenProps {
  calls: HydratedCallSession[];
  completedTranscripts: TranscriptMessage[][];
  completedFeedbacks: FeedbackInfo[];
  totalScore: number;
  dispatcherName: string;
  leaderboard: LeaderboardEntry[];
  scoreSubmitted: boolean;
  submittingScore: boolean;
  onSubmitLeaderboard: (e: React.FormEvent) => void;
  onReboot: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  calls,
  completedTranscripts,
  completedFeedbacks,
  totalScore,
  dispatcherName,
  leaderboard,
  scoreSubmitted,
  submittingScore,
  onSubmitLeaderboard,
  onReboot
}) => {
  const [selectedCallIndex, setSelectedCallIndex] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'leaderboard'>('results');

  const handleClosePreview = () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
  };

  const handleDownloadPreviewImage = () => {
    if (!previewImageUrl) return;
    const link = document.createElement('a');
    const safeCallsign = (dispatcherName || 'operator').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    link.href = previewImageUrl;
    link.setAttribute('download', `console-911-report-${safeCallsign}-${Date.now()}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleClosePreview();
    showToast('Shift report PNG download started', 'success');
  };


  // Assign dispatcher operator rating
  const getDispatcherRank = (score: number) => {
    if (score >= 1400)
      return {
        title: 'CHIEF DISPATCHER (LEVEL 5)',
        style: 'text-yellow-400 crt-glow-amber border-yellow-400/30'
      };
    if (score >= 1000)
      return {
        title: 'SENIOR OPERATOR (LEVEL 4)',
        style: 'text-emerald-400 crt-glow-green border-emerald-400/30'
      };
    if (score >= 600)
      return { title: 'ROOKIE SURVIVOR (LEVEL 3)', style: 'text-amber-500 border-amber-500/30' };
    if (score >= 200)
      return { title: 'JUNIOR LIABILITY (LEVEL 2)', style: 'text-orange-600 border-orange-600/30' };
    return {
      title: 'TERMINAL NEGLIGENCE (DISMISSED)',
      style: 'text-red-600 crt-glow-red border-red-600/30 animate-pulse'
    };
  };

  const rank = getDispatcherRank(totalScore);

  const generateMarkdownReport = (): string => {
    const rankObj = getDispatcherRank(totalScore);
    
    let md = `📞 **CONSOLE 911 - SHIFT REPORT**\n`;
    md += `**Operator:** ${dispatcherName.toUpperCase() || 'OPERATOR'}\n`;
    md += `**Rank:** ${rankObj.title}\n`;
    md += `**Total Score:** ${totalScore} PTS\n\n`;
    
    md += `**Shift Overview:**\n`;
    calls.forEach((call, idx) => {
      const feedback = completedFeedbacks[idx];
      const scoreVal = feedback?.totalCallScore !== undefined ? feedback.totalCallScore : 0;
      const scoreStr = `${scoreVal >= 0 ? '+' : ''}${scoreVal} PTS`;
      md += `- ${call.title} (${call.difficulty.toUpperCase()}): ${scoreStr}\n`;
    });
    return md;
  };

  const handleCopyToClipboard = async () => {
    const reportText = generateMarkdownReport();
    try {
      await navigator.clipboard.writeText(reportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      showToast('Shift report copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('Could not copy report to clipboard.', 'error');
    }
  };


  const generateReportCanvas = (): HTMLCanvasElement | null => {
    const rankObj = getDispatcherRank(totalScore);

    // Determine current theme class
    const container = document.querySelector('.theme-green, .theme-amber, .theme-cyan, .theme-silver, .theme-paper, .theme-lab');
    let currentTheme = 'green';
    if (container) {
      const match = container.className.match(/theme-(\w+)/);
      if (match) currentTheme = match[1];
    }
    const colors = getThemeColors(currentTheme);

    const getStatusColor = (status: 'SUCCESS' | 'MINOR_ERROR' | 'CRITICAL_FAILURE' | 'PENDING') => {
      const isLight = currentTheme === 'paper' || currentTheme === 'lab';
      switch (status) {
        case 'SUCCESS':
          return isLight ? '#0f766e' : '#10b981';
        case 'MINOR_ERROR':
          return isLight ? '#b45309' : '#f59e0b';
        case 'CRITICAL_FAILURE':
          return isLight ? '#b91c1c' : '#ef4444';
        case 'PENDING':
        default:
          return colors.textDim;
      }
    };

    const getRankColor = () => {
      const isLight = currentTheme === 'paper' || currentTheme === 'lab';
      if (totalScore >= 1400) return isLight ? '#b45309' : '#f59e0b';
      if (totalScore >= 1000) return isLight ? '#0f766e' : '#10b981';
      if (totalScore >= 600) return isLight ? '#b45309' : '#f59e0b';
      if (totalScore >= 200) return isLight ? '#c2410c' : '#ea580c';
      return isLight ? '#b91c1c' : '#ef4444';
    };

    // List of lines to render on canvas
    const linesToDraw: Array<{ type: 'text' | 'dim' | 'accent' | 'separator' | 'custom'; content: string; color?: string }> = [];

    // Header Banners
    linesToDraw.push({ type: 'accent', content: `====================================================================` });
    linesToDraw.push({ type: 'accent', content: `           CONSOLE 911 // EMERGENCY DISPATCH SHIFT REPORT` });
    linesToDraw.push({ type: 'accent', content: `====================================================================` });
    linesToDraw.push({ type: 'text', content: `OPERATOR CALLSIGN: ${dispatcherName.toUpperCase() || 'OPERATOR'}` });
    linesToDraw.push({ 
      type: 'custom', 
      color: getRankColor(), 
      content: `RANK ASSESSMENT:   ${rankObj.title}` 
    });
    linesToDraw.push({ type: 'accent', content: `====================================================================` });
    linesToDraw.push({ type: 'separator', content: `` });

    // Shift Overview
    linesToDraw.push({ type: 'accent', content: `## SHIFT OVERVIEW` });
    linesToDraw.push({ type: 'dim', content: `--------------------------------------------------------------------` });
    linesToDraw.push({ type: 'dim', content: `LN  INCIDENT                      DIFF    STATUS               SCORE` });
    linesToDraw.push({ type: 'dim', content: `--------------------------------------------------------------------` });

    calls.forEach((call, idx) => {
      const feedback = completedFeedbacks[idx];
      const difficulty = (call.difficulty || 'N/A').toUpperCase();
      
      let statusText = 'PENDING';
      let statusType: 'SUCCESS' | 'MINOR_ERROR' | 'CRITICAL_FAILURE' | 'PENDING' = 'PENDING';
      let scoreText = '---';

      if (feedback) {
        statusType = feedback.status;
        if (feedback.status === 'SUCCESS') {
          statusText = 'SUCCESS';
          scoreText = `+${feedback.totalCallScore} PTS`;
        } else if (feedback.status === 'MINOR_ERROR') {
          statusText = 'MINOR ERROR';
          scoreText = `${feedback.totalCallScore >= 0 ? '+' : ''}${feedback.totalCallScore} PTS`;
        } else {
          statusText = 'CRITICAL FAIL';
          scoreText = `${feedback.totalCallScore} PTS`;
        }
      }

      const colLine = (idx + 1).toString().padStart(2, '0') + '  ';
      let colTitle = call.title.toUpperCase();
      if (colTitle.length > 28) {
        colTitle = colTitle.substring(0, 25) + '...  ';
      } else {
        colTitle = colTitle.padEnd(30, ' ');
      }
      const colDiff = difficulty.substring(0, 7).toUpperCase().padEnd(8, ' ');
      const colStatus = statusText.padEnd(14, ' ');
      const colScore = scoreText.padStart(12, ' ');

      const rowText = `${colLine}${colTitle}${colDiff}${colStatus}${colScore}`;
      
      linesToDraw.push({
        type: 'custom',
        color: getStatusColor(statusType),
        content: rowText
      });
    });

    linesToDraw.push({ type: 'dim', content: `--------------------------------------------------------------------` });
    linesToDraw.push({ 
      type: 'custom', 
      color: getRankColor(), 
      content: `TOTAL SCORE: ${totalScore} PTS` 
    });
    linesToDraw.push({ type: 'accent', content: `====================================================================` });
    linesToDraw.push({ type: 'dim', content: `                     // END OF TRANSMISSION //` });

    const lineHeight = 20;
    const padding = 35;
    const width = 580; // Narrower canvas since lines are shorter!
    const height = linesToDraw.length * lineHeight + padding * 2;

    const canvas = document.createElement('canvas');
    const scale = 2; // high definition scale factor
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Draw background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw bezel line
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Draw scanlines
    const hasCrt = document.querySelector('.crt-effect') !== null;
    if (hasCrt && currentTheme !== 'paper' && currentTheme !== 'lab') {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.012)';
      for (let y = 10; y < height - 10; y += 3) {
        ctx.fillRect(10, y, width - 20, 1.2);
      }
    }

    // Set styling and draw text lines
    ctx.textBaseline = 'top';
    let currentY = padding;

    linesToDraw.forEach((line) => {
      if (line.type === 'accent') {
        ctx.font = `bold 12px "Courier New", Courier, monospace`;
        ctx.fillStyle = colors.accent;
      } else if (line.type === 'dim') {
        ctx.font = `12px "Courier New", Courier, monospace`;
        ctx.fillStyle = colors.textDim;
      } else if (line.type === 'custom' && line.color) {
        ctx.font = `bold 12px "Courier New", Courier, monospace`;
        ctx.fillStyle = line.color;
      } else {
        ctx.font = `12px "Courier New", Courier, monospace`;
        ctx.fillStyle = colors.text;
      }

      ctx.fillText(line.content, padding + 10, currentY);
      currentY += lineHeight;
    });

    return canvas;
  };

  const handleDownloadImage = () => {
    const canvas = generateReportCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreviewImageUrl(url);
    }, 'image/png');
  };

  const handleCopyImageToClipboard = () => {
    const canvas = generateReportCanvas();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        setCopyImageSuccess(true);
        setTimeout(() => setCopyImageSuccess(false), 3000);
        showToast('Shift report image copied to clipboard', 'success');
      } catch (err) {
        console.error('Failed to copy image: ', err);
        showToast('Failed to copy image. Browser clipboard write unsupported.', 'error');
      }
    }, 'image/png');
  };


  useEffect(() => {
    if (selectedCallIndex === null && !previewImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCallIndex(null);
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCallIndex, previewImageUrl]);

  useEffect(() => {
    if (scoreSubmitted) {
      const top10 = leaderboard.slice(0, 10);
      const inTop10 = top10.some(
        (entry) =>
          entry.name.toUpperCase() === dispatcherName.toUpperCase() &&
          entry.score === totalScore
      );
      if (inTop10) {
        const timer = setTimeout(() => {
          setActiveTab('leaderboard');
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [scoreSubmitted, leaderboard, dispatcherName, totalScore]);

  const transcriptToAudit =
    selectedCallIndex !== null ? completedTranscripts[selectedCallIndex] || [] : [];

  return (
    <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden p-4 sm:p-6 gap-6 md:justify-start max-w-6xl mx-auto w-full terminal-scroll">
      {/* MOBILE TABS SWITCHER */}
      <div className="flex md:hidden border-b border-emerald-950 bg-black shrink-0 select-none w-full mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`flex-1 py-3 text-center font-bold uppercase tracking-wider text-[10px] sm:text-xs border-r border-emerald-950 transition-all ${
            activeTab === 'results'
              ? 'text-emerald-400 bg-emerald-950/20 font-black'
              : 'text-emerald-500/40 hover:text-emerald-500/60'
          }`}
        >
          [1] Shift Review
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-3 text-center font-bold uppercase tracking-wider text-[10px] sm:text-xs transition-all ${
            activeTab === 'leaderboard'
              ? 'text-emerald-400 bg-emerald-950/20 font-black'
              : 'text-emerald-500/40 hover:text-emerald-500/60'
          }`}
        >
          [2] Leaderboard
        </button>
      </div>

      {/* LEFT COLUMN: PERFORMANCE & RANKING */}
      <section className={`flex-1 flex flex-col justify-start md:justify-start max-w-xl space-y-4 md:overflow-y-auto md:pr-2 terminal-scroll ${activeTab === 'results' ? 'flex' : 'hidden md:flex'}`}>
        <div className="border border-emerald-900 bg-zinc-950/70 p-5 rounded shadow-xl space-y-4">
          <h2 className="text-base font-bold tracking-widest text-emerald-400 border-b border-emerald-950 pb-2 uppercase text-center">
            Shift Operations Review
          </h2>

          {/* RANK ASSESSMENT & CUMULATIVE SCORE */}
          <div className="text-center p-4 border border-emerald-950 bg-black/60 rounded flex flex-col items-center gap-2">
            <span className="text-[10px] text-emerald-500/60 uppercase tracking-widest font-bold">
              Operator Performance Profile
            </span>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <span
                className={`text-xs sm:text-sm font-black tracking-widest uppercase border px-4 py-2 rounded-md ${rank.style}`}
              >
                RANK: {rank.title}
              </span>
              <span
                className={`text-xs sm:text-sm font-black tracking-widest uppercase border px-4 py-2 rounded-md ${rank.style}`}
              >
                SCORE: {totalScore} PTS
              </span>
            </div>
          </div>

          {/* SHIFT REPORT EXPORT BOARD */}
          <div className="border border-emerald-900 bg-zinc-950/40 p-4 rounded text-xs space-y-3">
            <h3 className="font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-950/60 pb-1 flex items-center justify-between">
              <span>💾 Shift Record Archivist</span>
              <span className="text-[9px] text-emerald-500/55 font-mono">EXPORT_v1.0</span>
            </h3>
            <p className="text-[10px] text-emerald-500/60 uppercase leading-relaxed text-left">
              Archive this shift&apos;s performance logs and dialogues to local formats.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                className="border border-emerald-900 bg-emerald-950/15 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 font-bold py-2 rounded text-[11px] transition-all cursor-pointer uppercase text-center"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="border border-emerald-900 bg-emerald-950/15 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 font-bold py-2 rounded text-[11px] transition-all cursor-pointer uppercase text-center"
              >
                {copySuccess ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
          </div>

          {/* GAME SCRIPT SUMMARY TABLE */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold text-emerald-500/70 uppercase tracking-widest border-b border-emerald-950/60 pb-1">
              Call Logs Audit (CLICK TO AUDIT)
            </h3>
            <div className="border border-emerald-950 bg-black/40 rounded overflow-hidden">
              <div className="overflow-x-auto w-full terminal-scroll">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-950 bg-emerald-950/20 text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">
                      <th className="px-3 py-2 w-12 text-center whitespace-nowrap">LINE</th>
                      <th className="px-3 py-2">INCIDENT</th>
                      <th className="px-3 py-2 w-28 hidden sm:table-cell whitespace-nowrap">DIFFICULTY</th>
                      <th className="px-3 py-2 w-40 whitespace-nowrap">STATUS</th>
                      <th className="px-3 py-2 w-28 text-right whitespace-nowrap">SCORE</th>
                      <th className="px-3 py-2 w-20 text-center whitespace-nowrap">AUDIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call, idx) => {
                      const hasTranscript =
                        completedTranscripts &&
                        completedTranscripts[idx] &&
                        completedTranscripts[idx].length > 0;
                      const feedback = completedFeedbacks[idx];

                      // Color coding for status and score
                      let statusText = 'PENDING';
                      let statusClass = 'text-emerald-500/40';
                      let scoreText = '---';
                      let scoreClass = 'text-emerald-500/40';

                      if (feedback) {
                        if (feedback.status === 'SUCCESS') {
                          statusText = 'SUCCESS';
                          statusClass = 'text-emerald-400 font-bold crt-glow-green';
                          scoreClass = 'text-emerald-400 font-bold';
                          scoreText = `+${feedback.totalCallScore} PTS`;
                        } else if (feedback.status === 'MINOR_ERROR') {
                          statusText = 'MINOR ERROR';
                          statusClass = 'text-amber-500 font-bold crt-glow-amber';
                          scoreClass = feedback.totalCallScore >= 0 ? 'text-emerald-400 font-bold' : 'text-red-500 font-bold';
                          scoreText = `${feedback.totalCallScore >= 0 ? '+' : ''}${feedback.totalCallScore} PTS`;
                        } else {
                          statusText = 'CRITICAL FAIL';
                          statusClass = 'text-red-500 font-bold crt-glow-red animate-pulse';
                          scoreClass = 'text-red-500 font-bold';
                          scoreText = `${feedback.totalCallScore} PTS`;
                        }
                      }

                      // Color coding for difficulty
                      let diffClass = 'text-emerald-400/80';
                      if (call.difficulty === 'medium') {
                        diffClass = 'text-amber-500/80';
                      } else if (call.difficulty === 'hard') {
                        diffClass = 'text-orange-500/80';
                      }

                      return (
                        <tr
                          key={idx}
                          onClick={() => hasTranscript && setSelectedCallIndex(idx)}
                          className={`border-b border-emerald-950/20 font-mono text-[11px] sm:text-xs transition-colors ${
                            hasTranscript
                              ? 'hover:bg-emerald-950/15 cursor-pointer text-emerald-500/90 hover:text-emerald-300'
                              : 'opacity-50 cursor-not-allowed text-emerald-500/60'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center font-bold">
                            {(idx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-3 py-2.5 font-bold uppercase truncate max-w-[120px] sm:max-w-none">
                            {call.title}
                          </td>
                          <td className={`px-3 py-2.5 hidden sm:table-cell font-semibold uppercase whitespace-nowrap ${diffClass}`}>
                            {call.difficulty}
                          </td>
                          <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                            <span className={statusClass}>{statusText}</span>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${scoreClass}`}>
                            {scoreText}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {hasTranscript ? (
                              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider animate-pulse hover:text-emerald-300 transition-colors">
                                [AUDIT]
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-950 font-semibold uppercase tracking-wider">
                                [N/A]
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LEADERBOARD SUBMISSION FORM */}
          {!scoreSubmitted ? (
            <form
              onSubmit={onSubmitLeaderboard}
              className="border-t border-emerald-950 pt-4 flex flex-col items-center gap-3"
            >
              <span className="text-xs text-emerald-500/80 font-bold uppercase tracking-wider text-center">
                Submit Callsign to Global Leaderboard:
              </span>
              <div className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  readOnly
                  value={dispatcherName}
                  className="bg-zinc-950/40 border border-emerald-950 text-center text-emerald-600/70 text-xs py-2 px-3 rounded flex-1 focus:outline-none uppercase tracking-widest font-bold select-none cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={submittingScore || !dispatcherName.trim()}
                  className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 hover:border-emerald-500 disabled:opacity-40 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs px-6 py-2 rounded transition-all cursor-pointer whitespace-nowrap"
                >
                  {submittingScore ? 'Transacting...' : 'Upload Score'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center text-emerald-400 text-xs border-t border-emerald-950 pt-4 animate-pulse uppercase tracking-widest font-bold">
              ✓ Score Posted Successfully to Global Database.
            </div>
          )}


          {/* REBOOT GAME BUTTON */}
          <div className="text-center pt-2">
            <button
              onClick={onReboot}
              className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-3 px-8 rounded cursor-pointer transition-all active:scale-95"
            >
              Reboot Console System
            </button>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: HIGH SCORE LEADERBOARD */}
      <section className={`w-full md:w-80 flex flex-col justify-start md:justify-start max-w-full md:max-w-sm shrink-0 ${activeTab === 'leaderboard' ? 'flex' : 'hidden md:flex'}`}>
        <div className="border border-emerald-900 bg-zinc-950/70 p-5 rounded shadow-xl space-y-4 flex flex-col max-h-[480px]">
          <h2 className="text-base font-bold tracking-widest text-emerald-400 border-b border-emerald-950 pb-2 uppercase text-center crt-glow-green">
            Global Database Rankings
          </h2>

          <div className="flex-1 overflow-y-auto terminal-scroll pr-1 border border-emerald-950 bg-black/60 rounded">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="border-b border-emerald-950 bg-zinc-950 text-emerald-500/70 text-[9px] uppercase tracking-wider">
                  <th className="py-2 px-3 w-12 text-center">Rank</th>
                  <th className="py-2 px-2">Callsign</th>
                  <th className="py-2 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/20 font-mono">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 10).map((entry, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-emerald-950/10 ${entry.name === dispatcherName.toUpperCase() ? 'bg-emerald-950/20 text-emerald-300 font-bold' : 'text-emerald-500/80'}`}
                    >
                      <td className="py-2 px-3 text-center">{idx + 1}</td>
                      <td className="py-2 px-2 uppercase tracking-wide truncate max-w-[120px]">
                        {entry.name}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400">{entry.score} PTS</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-emerald-800 uppercase tracking-widest text-[10px]"
                    >
                      Database Empty. Write first entry!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[9px] text-center text-emerald-500/40 uppercase select-none">
            Leaderboard data syncs live.
          </div>
        </div>
      </section>

      {/* CALL AUDIT MODAL OVERLAY */}
      {selectedCallIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4 select-text"
          onClick={() => setSelectedCallIndex(null)}
        >
          <div
            className="w-full h-full sm:h-auto sm:max-w-2xl border-0 sm:border border-emerald-500 bg-zinc-950 p-4 sm:p-6 rounded-none sm:rounded shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col max-h-[100dvh] sm:max-h-[85vh] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-emerald-950 pb-3 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold tracking-widest text-emerald-400 uppercase">
                Call Audit: {calls[selectedCallIndex]?.title}
              </h3>
              <button
                onClick={() => setSelectedCallIndex(null)}
                className="sm:hidden text-red-500 hover:text-red-400 font-bold uppercase text-[10px] border border-red-950 bg-red-950/20 px-2 py-0.5 rounded cursor-pointer"
              >
                [CLOSE]
              </button>
              <span className="hidden sm:inline text-[10px] text-emerald-500/60 uppercase font-bold">
                Difficulty: {calls[selectedCallIndex]?.difficulty}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-4 border border-emerald-950 bg-black/40 rounded terminal-scroll max-h-[70vh] sm:max-h-[50vh]">
              {transcriptToAudit
                .filter((msg) => msg.sender === 'dispatcher' || msg.sender === 'caller')
                .map((msg, idx) => {
                  const isDispatcher = msg.sender === 'dispatcher';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[85%] ${isDispatcher ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[10px] opacity-75 text-emerald-500/40 mb-1 select-none">
                        [{msg.timestamp}] {isDispatcher ? 'DISPATCHER' : 'CALLER'}
                      </span>
                      <div
                        className={`rounded px-3 py-2 text-xs leading-relaxed border ${
                          isDispatcher
                            ? 'bg-amber-950/20 border-amber-800 text-amber-400 font-bold'
                            : 'bg-emerald-950/20 border-emerald-900 text-emerald-300'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="border-t border-emerald-950 pt-3 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-emerald-500/40 uppercase font-bold">
                <span className="hidden sm:inline">[ESC] KEY TO EXIT</span>
                <span className="inline sm:hidden">TAP OUTSIDE TO EXIT</span>
              </span>
              <button
                onClick={() => setSelectedCallIndex(null)}
                className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-2 px-6 rounded cursor-pointer transition-all"
              >
                [CLOSE AUDIT]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL OVERLAY */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 select-none"
          onClick={handleClosePreview}
        >
          <div
            className="w-full max-w-2xl border border-emerald-950 bg-zinc-950 p-6 rounded shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col max-h-[90vh] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-emerald-950 pb-3 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Shift Report Image Preview
              </h3>
              <button
                onClick={handleClosePreview}
                className="text-emerald-500 hover:text-emerald-300 font-bold uppercase text-[10px] tracking-wider border border-emerald-950 bg-emerald-950/20 px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-900/40 transition-all"
              >
                [ESC] CLOSE
              </button>
            </div>

            {/* Scrollable image container */}
            <div className="flex-1 overflow-y-auto p-2 border border-emerald-950 bg-black/60 rounded flex items-center justify-center terminal-scroll min-h-[300px]">
              <img
                src={previewImageUrl}
                alt="Shift Performance Report Preview"
                className="max-w-full h-auto border border-emerald-900/40 rounded shadow-lg select-none"
              />
            </div>

            <div className="border-t border-emerald-950 pt-3 flex justify-between items-center shrink-0">
              <button
                onClick={handleClosePreview}
                className="bg-zinc-900 hover:bg-zinc-800 border border-emerald-950 text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-widest text-xs py-2 px-6 rounded cursor-pointer transition-all"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-2 px-6 rounded cursor-pointer transition-all active:scale-95"
                >
                  {copyImageSuccess ? 'Copied!' : 'Copy Image'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPreviewImage}
                  className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-2.5 px-8 rounded cursor-pointer transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  Download PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
