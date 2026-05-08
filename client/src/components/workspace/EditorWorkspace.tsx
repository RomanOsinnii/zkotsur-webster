import type React from 'react';
import { Circle as CircleIcon, Download, Grid3X3, ImagePlus, MousePointer2, Square, Triangle as TriangleIcon, Type } from 'lucide-react';
import { CornerHandle, GalleryTemplate, ResizeHandle, SnapLine, ToolMode } from '../../lib/editorTypes';

type Props = {
  isTemplatesMode: boolean;
  activeFrameName: string;
  activeFrameSizeLabel: string;
  openEditorWorkspace: () => void;
  setWorkspaceMode: (mode: 'templates' | 'editor') => void;
  workspaceZoom: number;
  setWorkspacePan: (value: { x: number; y: number }) => void;
  setZoom: (value: number) => void;
  zoomPercent: number;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  exportFrame: () => void;
  galleryTemplates: GalleryTemplate[];
  createProjectFromTemplate: (template: GalleryTemplate) => void;
  spacePressed: boolean;
  startWorkspacePan: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleStagePointerEnter: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleStagePointerLeave: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleStagePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  canvasStageRef: React.RefObject<HTMLDivElement>;
  activeFrameRef: React.RefObject<HTMLDivElement>;
  workspacePan: { x: number; y: number };
  canvasElementRef: React.RefObject<HTMLCanvasElement>;
  snapLines: SnapLine[];
  resizeHandles: ResizeHandle[];
  startResizeDrag: (event: React.PointerEvent<HTMLButtonElement>, corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft') => void;
  cornerHandles: CornerHandle[];
  startCornerRadiusDrag: (event: React.PointerEvent<HTMLButtonElement>, corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft') => void;
  activeTool: ToolMode;
  setActiveTool: (value: ToolMode) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
};

export function EditorWorkspace(props: Props) {
  const {
    isTemplatesMode, activeFrameName, activeFrameSizeLabel, openEditorWorkspace, setWorkspaceMode,
    workspaceZoom, setWorkspacePan, setZoom, zoomPercent, showGrid, setShowGrid, exportFrame,
    galleryTemplates, createProjectFromTemplate, spacePressed, startWorkspacePan,
    handleStagePointerEnter, handleStagePointerLeave, handleStagePointerMove, canvasStageRef,
    activeFrameRef, workspacePan, canvasElementRef, snapLines, resizeHandles, startResizeDrag,
    cornerHandles, startCornerRadiusDrag, activeTool, setActiveTool, fileInputRef
  } = props;

  return (
    <section className="workspace" aria-label="Design workspace">
      <header className="topbar">
        <div className="topbar-brand"><span className="topbar-brand-mark">W</span><div><strong className="topbar-brand-title">{isTemplatesMode ? 'Creative Craft' : activeFrameName}</strong><p className="eyebrow topbar-brand-subtitle">{isTemplatesMode ? 'Design made simple. Creations made brilliant.' : `${activeFrameSizeLabel} · Design made simple`}</p></div></div>
        <nav aria-label="Workspace sections" className="topbar-nav"><button aria-current={!isTemplatesMode ? 'page' : undefined} className={!isTemplatesMode ? 'topbar-nav-item active' : 'topbar-nav-item'} onClick={openEditorWorkspace} type="button">Home</button><button aria-current={isTemplatesMode ? 'page' : undefined} className={isTemplatesMode ? 'topbar-nav-item active' : 'topbar-nav-item'} onClick={() => setWorkspaceMode('templates')} type="button">Templates</button></nav>
        <div className="topbar-actions">{isTemplatesMode ? <button className="primary-button topbar-action-pill topbar-action-primary" onClick={openEditorWorkspace} title="Open editor" type="button">CREATE DESIGN <span aria-hidden className="topbar-plus-badge">+</span></button> : <><div className="topbar-pill-group" aria-label="Workspace zoom"><button className="topbar-pill-button" onClick={() => setZoom(workspaceZoom - 0.1)} title="Zoom out" type="button">-</button><button className="topbar-pill-button topbar-pill-value" onClick={() => { setWorkspacePan({ x: 0, y: 0 }); setZoom(0.62); }} title="Reset zoom and pan" type="button">{zoomPercent}%</button><button className="topbar-pill-button" onClick={() => setZoom(workspaceZoom + 0.1)} title="Zoom in" type="button">+</button></div><button className={showGrid ? 'topbar-action-pill active' : 'topbar-action-pill'} onClick={() => setShowGrid((value) => !value)} title="Toggle grid" type="button"><Grid3X3 size={16} /> Grid</button><button className="primary-button topbar-action-pill topbar-action-primary" onClick={exportFrame} title="Export current frame as PNG" type="button"><Download size={16} /> Export PNG</button></>}</div>
      </header>

      {isTemplatesMode ? (
        <section className="templates-gallery" aria-label="Template gallery"><div className="templates-gallery-grid">{galleryTemplates.map((item) => <button className={`templates-gallery-card ${item.toneClass}`} key={item.id} onClick={() => createProjectFromTemplate(item)} type="button"><div className="templates-gallery-copy"><strong>{item.title}</strong><p>{item.subtitle}</p><small>{item.size}</small><span className="templates-gallery-cta">Use template</span></div></button>)}</div></section>
      ) : (
        <div className={`${showGrid ? 'canvas-stage grid-visible' : 'canvas-stage'} ${spacePressed ? 'pan-mode' : ''}`} onPointerDown={startWorkspacePan} onPointerEnter={handleStagePointerEnter} onPointerLeave={handleStagePointerLeave} onPointerMove={handleStagePointerMove} ref={canvasStageRef}>
          <div className="active-canvas-frame" ref={activeFrameRef} style={{ transform: `translate(${workspacePan.x}px, ${workspacePan.y}px) scale(${workspaceZoom})` }}>
            <canvas ref={canvasElementRef} />
            {snapLines.map((line, index) => <div key={index} className={`snap-line snap-line-${line.direction}`} style={{ [line.direction === 'horizontal' ? 'top' : 'left']: `${line.position}px` }} />)}
            {resizeHandles.map((handle) => <button aria-label={`Resize from ${handle.key} corner`} className="corner-resize-handle" key={handle.key} onPointerDown={(event) => startResizeDrag(event, handle.key)} style={{ left: handle.left, top: handle.top, cursor: handle.cursor }} title="Drag to resize" type="button" />)}
            {cornerHandles.map((handle) => <button aria-label={`Drag ${handle.key} radius handle. Hold Ctrl to edit only this corner.`} className="corner-radius-handle" key={handle.key} onPointerDown={(event) => startCornerRadiusDrag(event, handle.key)} style={{ left: handle.left, top: handle.top, cursor: handle.cursor }} title="Drag: all corners. Ctrl+drag: only this corner." type="button" />)}
          </div>
          <div className="floating-toolbar" aria-label="Object tools"><button className={activeTool === 'select' ? 'active' : ''} onClick={() => setActiveTool('select')} title="Select (V)" type="button"><MousePointer2 size={20} /><span>V</span></button><button className={activeTool === 'text' ? 'active' : ''} onClick={() => setActiveTool('text')} title="Text (T)" type="button"><Type size={22} /><span>T</span></button><button className={activeTool === 'box' ? 'active' : ''} onClick={() => setActiveTool('box')} title="Box (B)" type="button"><Square size={20} /><span>B</span></button><button className={activeTool === 'circle' ? 'active' : ''} onClick={() => setActiveTool('circle')} title="Circle (C)" type="button"><CircleIcon size={20} /><span>C</span></button><button className={activeTool === 'shape' ? 'active' : ''} onClick={() => setActiveTool('shape')} title="Shape (P)" type="button"><TriangleIcon size={20} /><span>P</span></button><button onClick={() => fileInputRef.current?.click()} title="Image (I)" type="button"><ImagePlus size={20} /><span>I</span></button></div>
        </div>
      )}
    </section>
  );
}

