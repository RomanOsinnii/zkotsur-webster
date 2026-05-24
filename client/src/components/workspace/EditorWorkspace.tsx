import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Circle as CircleIcon, Download, Grid3X3, History, ImagePlus, MousePointer2, PenTool, Share2, Sparkles, Square, Triangle as TriangleIcon, Type } from 'lucide-react';
import { CornerHandle, GalleryTemplate, ResizeHandle, SnapLine, ToolMode } from '../../lib/editorTypes';
import { type UpdateTemplatePayload } from '../../api/templates';

type Props = {
  isReadOnly: boolean;
  isTemplatesMode: boolean;
  activeFrameName: string;
  activeFrameSizeLabel: string;
  projectName: string;
  setProjectName: (value: string) => void;
  projectId: string | null;
  saveStatusLabel: string;
  saveHint: string;
  projectStatus: string;
  projectRequestBusy: boolean;
  openEditorWorkspace: () => void;
  openProjectsWorkspace: () => void;
  isProjectsView: boolean;
  setWorkspaceMode: (mode: 'templates' | 'editor') => void;
  workspaceZoom: number;
  setWorkspacePan: (value: { x: number; y: number }) => void;
  setZoom: (value: number) => void;
  zoomPercent: number;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  exportFrame: (format: 'png' | 'jpg' | 'pdf') => void;
  createTemplateFromCurrentProject: () => void;
  shareCurrentProject: () => void;
  openHistoryModal: () => void;
  shareModalOpen: boolean;
  shareModalUrl: string;
  shareVisitors: Array<{ username: string; visitedAt: string }>;
  closeShareModal: () => void;
  copyShareModalLink: () => void;
  historyModalOpen: boolean;
  closeHistoryModal: () => void;
  historyBranches: Array<{ id: string; name: string; steps: number; isActive: boolean }>;
  historySteps: Array<{ index: number; label: string; changedAt: string; isActive: boolean }>;
  switchHistoryBranch: (branchId: string) => void;
  restoreHistoryStep: (index: number) => void;
  shareToLinkedIn: () => void;
  shareToFacebook: () => void;
  shareToX: () => void;
  disableProjectShare: () => void;
  isProjectShared: boolean;
  shareBusy: boolean;
  shareStatus: string;
  shareError: string;
  galleryTemplates: GalleryTemplate[];
  templateCatalogCount: number;
  templateCategories: string[];
  activeTemplateCategory: string;
  setActiveTemplateCategory: (value: string) => void;
  templateSearchQuery: string;
  setTemplateSearchQuery: (value: string) => void;
  templateSort: 'recommended' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc';
  setTemplateSort: (value: 'recommended' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc') => void;
  templatesLoading: boolean;
  templatesError: string;
  canManageTemplates: boolean;
  updatingTemplateId: string | null;
  deletingTemplateId: string | null;
  updateTemplateItem: (id: string, payload: UpdateTemplatePayload) => Promise<void>;
  deleteTemplateItem: (id: string) => Promise<void>;
  createProjectFromTemplate: (template: GalleryTemplate) => void;
  undoTemplateProjectCreation: () => boolean;
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
    isReadOnly, isTemplatesMode, activeFrameName, activeFrameSizeLabel, projectName, setProjectName,
    projectId, saveStatusLabel, saveHint, projectStatus, projectRequestBusy,
    openProjectsWorkspace, isProjectsView,
    openEditorWorkspace, setWorkspaceMode,
    workspaceZoom, setWorkspacePan, setZoom, zoomPercent, showGrid, setShowGrid, exportFrame,
    createTemplateFromCurrentProject, shareCurrentProject, openHistoryModal, shareModalOpen, shareModalUrl, shareVisitors, closeShareModal, copyShareModalLink, historyModalOpen, closeHistoryModal, historyBranches, historySteps, switchHistoryBranch, restoreHistoryStep, shareToLinkedIn, shareToFacebook, shareToX,
    disableProjectShare, isProjectShared, shareBusy, shareStatus, shareError,
    galleryTemplates, templateCatalogCount, templateCategories, activeTemplateCategory, setActiveTemplateCategory,
    templateSearchQuery, setTemplateSearchQuery, templateSort, setTemplateSort,
    templatesLoading, templatesError,
    canManageTemplates, updatingTemplateId, deletingTemplateId, updateTemplateItem, deleteTemplateItem,
    createProjectFromTemplate, undoTemplateProjectCreation,
    spacePressed, startWorkspacePan,
    handleStagePointerEnter, handleStagePointerLeave, handleStagePointerMove, canvasStageRef,
    activeFrameRef, workspacePan, canvasElementRef, snapLines, resizeHandles, startResizeDrag,
    cornerHandles, startCornerRadiusDrag, activeTool, setActiveTool, fileInputRef
  } = props;

  const templateButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [galleryColumns, setGalleryColumns] = useState(4);
  const [templateToast, setTemplateToast] = useState('');
  const [quickExportFormat, setQuickExportFormat] = useState<'png' | 'jpg' | 'pdf'>('png');

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width <= 760) {
        setGalleryColumns(1);
      } else if (width <= 1100) {
        setGalleryColumns(2);
      } else {
        setGalleryColumns(4);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);

    return () => {
      window.removeEventListener('resize', updateColumns);
    };
  }, []);

  useEffect(() => {
    if (!templateToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTemplateToast('');
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [templateToast]);

  const getTemplateRatioClass = (item: GalleryTemplate) => {
    const ratio = item.width / item.height;
    if (ratio > 1.2) return 'landscape';
    if (ratio < 0.9) return 'portrait';
    return 'square';
  };

  const getTemplateRatioLabel = (item: GalleryTemplate) => {
    const ratioClass = getTemplateRatioClass(item);
    if (ratioClass === 'landscape') return 'Landscape';
    if (ratioClass === 'portrait') return 'Portrait';
    return 'Square';
  };

  const formatCategoryLabel = (category: string) => {
    if (!category) return 'General';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const clearAllTemplateFilters = () => {
    setActiveTemplateCategory('all');
    setTemplateSearchQuery('');
  };

  const renderHighlightedTitle = (title: string) => {
    const query = templateSearchQuery.trim();
    if (!query) {
      return title;
    }

    const lowerTitle = title.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const result: React.ReactNode[] = [];
    let cursor = 0;

    while (cursor < title.length) {
      const matchIndex = lowerTitle.indexOf(lowerQuery, cursor);
      if (matchIndex === -1) {
        result.push(title.slice(cursor));
        break;
      }

      if (matchIndex > cursor) {
        result.push(title.slice(cursor, matchIndex));
      }

      const matchedText = title.slice(matchIndex, matchIndex + query.length);
      result.push(<mark key={`${matchIndex}-${matchedText}`}>{matchedText}</mark>);
      cursor = matchIndex + query.length;
    }

    return result;
  };

  const hasActiveTemplateFilters = activeTemplateCategory !== 'all' || templateSearchQuery.trim().length > 0;

  const focusTemplateByIndex = (index: number) => {
    if (index < 0 || index >= galleryTemplates.length) {
      return;
    }
    templateButtonRefs.current[index]?.focus();
  };

  const handleTemplateCardKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = index + 1;
    if (event.key === 'ArrowLeft') nextIndex = index - 1;
    if (event.key === 'ArrowDown') nextIndex = index + galleryColumns;
    if (event.key === 'ArrowUp') nextIndex = index - galleryColumns;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = galleryTemplates.length - 1;

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    focusTemplateByIndex(nextIndex);
  };

  const handleCreateFromTemplate = (item: GalleryTemplate) => {
    createProjectFromTemplate(item);
    setTemplateToast(`Template "${item.title}" applied.`);
  };

  const handleTemplateEdit = async (item: GalleryTemplate) => {
    const nextName = window.prompt('Template name', item.title);
    if (nextName === null) return;

    const nextCategory = window.prompt('Template category', item.category);
    if (nextCategory === null) return;

    const nextWidthRaw = window.prompt('Template width', String(item.width));
    if (nextWidthRaw === null) return;

    const nextHeightRaw = window.prompt('Template height', String(item.height));
    if (nextHeightRaw === null) return;

    const nextWidth = Number(nextWidthRaw);
    const nextHeight = Number(nextHeightRaw);
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) {
      setTemplateToast('Template update aborted: width and height must be positive numbers.');
      return;
    }

    const payload: UpdateTemplatePayload = {
      name: nextName.trim(),
      category: nextCategory.trim().toLowerCase(),
      width: Math.round(nextWidth),
      height: Math.round(nextHeight)
    };

    await updateTemplateItem(item.id, payload);
    setTemplateToast(`Template "${payload.name || item.title}" updated.`);
  };

  const handleTemplateDelete = async (item: GalleryTemplate) => {
    const shouldDelete = window.confirm(`Delete template "${item.title}"?`);
    if (!shouldDelete) {
      return;
    }

    await deleteTemplateItem(item.id);
    setTemplateToast(`Template "${item.title}" deleted.`);
  };

  const projectStatusChipLabel = /saving/i.test(saveStatusLabel) || projectRequestBusy || /loading|deleting|exporting/i.test(projectStatus)
      ? 'Syncing...'
      : saveStatusLabel;

  const projectStatusClass = /failed/i.test(saveStatusLabel)
    ? 'error'
    : /saving/i.test(saveStatusLabel) || projectRequestBusy || /loading|deleting|exporting/i.test(projectStatus)
      ? 'working'
      : /saved/i.test(saveStatusLabel)
        ? 'saved'
        : /unsaved/i.test(saveStatusLabel)
          ? 'draft'
          : projectId
            ? 'synced'
            : 'draft';

  const shareStatusClass = shareError ? 'error' : shareStatus ? 'saved' : 'draft';
  const publicLinkButtonLabel = isProjectShared ? 'Link ON' : 'Link OFF';
  const publicLinkButtonTitle = isProjectShared
    ? 'Public share link is enabled. Click to stop sharing.'
    : 'Public share link is disabled. Use Share link to enable it.';

  const isEditorTopbar = !isTemplatesMode && !isProjectsView;
  const topbarModeLabel = isTemplatesMode ? 'Templates catalog' : 'Projects workspace';

  return (
    <section className="workspace" aria-label="Design workspace">
      <header className={isEditorTopbar ? 'topbar' : 'topbar topbar-compact'}>
        <div className="topbar-main">
          <div className="topbar-left">
            {!isEditorTopbar ? (
              <span className="topbar-mode-label">{topbarModeLabel}</span>
            ) : (
              <>
                <input
                  aria-label="Project name"
                  className="topbar-project-input"
                  disabled={isReadOnly}
                  maxLength={120}
                  onChange={(event) => setProjectName(event.target.value)}
                  type="text"
                  value={projectName}
                />
                <div className="topbar-meta" aria-label="Active frame details">
                  <span className="topbar-frame-chip">{activeFrameName}</span>
                  <span className="topbar-size-chip">{activeFrameSizeLabel}</span>
                  <span className={`topbar-state-chip ${projectStatusClass}`}>{projectStatusChipLabel}</span>
                  {saveHint ? <span className="topbar-size-chip">{saveHint}</span> : null}
                  {shareStatus || shareError ? <span className={`topbar-state-chip ${shareStatusClass}`}>{shareError || shareStatus}</span> : null}
                </div>
              </>
            )}
          </div>

          <div className="topbar-actions">
            {!isEditorTopbar ? (
              <button className="primary-button topbar-action-pill topbar-action-primary" onClick={openEditorWorkspace} title="Open editor" type="button">
                CREATE DESIGN
                <span aria-hidden className="topbar-plus-badge">+</span>
              </button>
            ) : (
              <>
                <div className="topbar-action-group" aria-label="Viewport controls">
                  <div className="topbar-pill-group" aria-label="Workspace zoom">
                    <button className="topbar-pill-button" onClick={() => setZoom(workspaceZoom - 0.1)} title="Zoom out" type="button">-</button>
                    <button className="topbar-pill-button topbar-pill-value" onClick={() => { setWorkspacePan({ x: 0, y: 0 }); setZoom(0.62); }} title="Reset zoom and pan" type="button">{zoomPercent}%</button>
                    <button className="topbar-pill-button" onClick={() => setZoom(workspaceZoom + 0.1)} title="Zoom in" type="button">+</button>
                  </div>
                  <button
                    aria-label="Toggle grid"
                    className={showGrid ? 'topbar-action-pill topbar-icon-action active' : 'topbar-action-pill topbar-icon-action'}
                    onClick={() => setShowGrid((value) => !value)}
                    title="Toggle grid"
                    type="button"
                  >
                    <Grid3X3 size={16} />
                  </button>
                </div>

                <div className="topbar-action-group" aria-label="Project actions">
                  <button
                    aria-label="Save current project as template"
                    className="topbar-action-pill topbar-icon-action"
                    disabled={isReadOnly}
                    onClick={createTemplateFromCurrentProject}
                    title="Save current project as reusable template"
                    type="button"
                  >
                    <Sparkles size={15} />
                  </button>
                  <button
                    aria-label="Create or copy public share link"
                    className="topbar-action-pill topbar-icon-action"
                    disabled={isReadOnly || !projectId || shareBusy}
                    onClick={shareCurrentProject}
                    title={projectId ? 'Create or copy public share link' : 'Save the project before sharing.'}
                    type="button"
                  >
                    <Share2 size={14} />
                    <span className="topbar-social-mark">Share link</span>
                  </button>
                  <button
                    aria-label="Open history"
                    className="topbar-action-pill topbar-icon-action"
                    disabled={isReadOnly}
                    onClick={openHistoryModal}
                    title="Open project history"
                    type="button"
                  >
                    <History size={14} />
                    <span className="topbar-social-mark">History</span>
                  </button>
                  <div className="topbar-social-group" aria-label="Share to social networks">
                    <button
                      aria-label="Share project to LinkedIn"
                      className="topbar-action-pill topbar-icon-action topbar-social-button"
                      disabled={isReadOnly || !projectId || shareBusy}
                      onClick={shareToLinkedIn}
                      title={projectId ? 'Share this project on LinkedIn' : 'Save the project before sharing.'}
                      type="button"
                    >
                      <span className="topbar-social-badge topbar-social-badge-linkedin" aria-hidden>in</span>
                      <span className="topbar-social-mark">LinkedIn</span>
                    </button>
                    <button
                      aria-label="Share project to Facebook"
                      className="topbar-action-pill topbar-icon-action topbar-social-button"
                      disabled={isReadOnly || !projectId || shareBusy}
                      onClick={shareToFacebook}
                      title={projectId ? 'Share this project on Facebook' : 'Save the project before sharing.'}
                      type="button"
                    >
                      <span className="topbar-social-badge topbar-social-badge-facebook" aria-hidden>f</span>
                      <span className="topbar-social-mark">Facebook</span>
                    </button>
                    <button
                      aria-label="Share project to X"
                      className="topbar-action-pill topbar-icon-action topbar-social-button"
                      disabled={isReadOnly || !projectId || shareBusy}
                      onClick={shareToX}
                      title={projectId ? 'Share this project on X' : 'Save the project before sharing.'}
                      type="button"
                    >
                      <span className="topbar-social-badge topbar-social-badge-x" aria-hidden>X</span>
                      <span className="topbar-social-mark">X</span>
                    </button>
                  </div>
                  <button
                    aria-label={isProjectShared ? 'Stop sharing public link' : 'Public link sharing is off'}
                    className={isProjectShared ? 'topbar-action-pill topbar-icon-action active' : 'topbar-action-pill topbar-icon-action'}
                    disabled={isReadOnly || !isProjectShared || shareBusy}
                    onClick={disableProjectShare}
                    title={publicLinkButtonTitle}
                    type="button"
                  >
                    <Share2 size={14} />
                    <span className="topbar-social-mark">{publicLinkButtonLabel}</span>
                  </button>
                </div>

                <div className="topbar-action-group topbar-action-group-export" aria-label="Export actions">
                  <select
                    aria-label="Quick export format"
                    className="topbar-export-select"
                    onChange={(event) => setQuickExportFormat(event.target.value as 'png' | 'jpg' | 'pdf')}
                    value={quickExportFormat}
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <button
                    className="primary-button topbar-action-pill topbar-action-primary"
                    onClick={() => exportFrame(quickExportFormat)}
                    title={`Export current frame as ${quickExportFormat.toUpperCase()}`}
                    type="button"
                  >
                    <Download size={16} />
                    Export {quickExportFormat.toUpperCase()}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {isTemplatesMode ? (
        <section className="templates-gallery" aria-label="Template gallery">
          <div className="templates-gallery-head">
            <h2>Choose a template</h2>
            <span>{templatesLoading ? 'Loading templates...' : `${galleryTemplates.length} templates`}</span>
          </div>

          <div className="templates-gallery-controls">
            <div className="templates-gallery-filters" role="tablist" aria-label="Template categories">
              {templateCategories.map((category) => (
                <button
                  key={category}
                  className={category === activeTemplateCategory ? 'templates-filter-chip active' : 'templates-filter-chip'}
                  type="button"
                  role="tab"
                  aria-selected={category === activeTemplateCategory}
                  onClick={() => setActiveTemplateCategory(category)}
                >
                  {category === 'all' ? 'All' : formatCategoryLabel(category)}
                </button>
              ))}
            </div>

            <label className="templates-search" aria-label="Search templates">
              <input
                type="search"
                value={templateSearchQuery}
                onChange={(event) => setTemplateSearchQuery(event.target.value)}
                placeholder="Search templates..."
              />
            </label>

            <label className="templates-sort" aria-label="Sort templates">
              <span>Sort</span>
              <select value={templateSort} onChange={(event) => setTemplateSort(event.target.value as 'recommended' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc')}>
                <option value="recommended">Recommended</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-asc">Size: small-large</option>
                <option value="size-desc">Size: large-small</option>
              </select>
            </label>

            {hasActiveTemplateFilters ? (
              <div className="templates-active-chips" aria-label="Active template filters">
                {activeTemplateCategory !== 'all' ? (
                  <button
                    className="templates-active-chip"
                    type="button"
                    onClick={() => setActiveTemplateCategory('all')}
                  >
                    Category: {formatCategoryLabel(activeTemplateCategory)} <span aria-hidden>×</span>
                  </button>
                ) : null}

                {templateSearchQuery.trim() ? (
                  <button
                    className="templates-active-chip"
                    type="button"
                    onClick={() => setTemplateSearchQuery('')}
                  >
                    Search: "{templateSearchQuery.trim()}" <span aria-hidden>×</span>
                  </button>
                ) : null}

                <button className="templates-clear-all" type="button" onClick={clearAllTemplateFilters}>Clear all</button>
              </div>
            ) : null}
          </div>

          {templatesError ? <p className="templates-gallery-status templates-gallery-status-error">{templatesError}</p> : null}

          {!templatesLoading && galleryTemplates.length === 0 ? (
            templateCatalogCount > 0 && hasActiveTemplateFilters ? (
              <div className="templates-empty-state" role="status" aria-live="polite">
                <strong>No templates match your filters</strong>
                <p>Try a different category, shorten your query, or reset filters to see all available templates.</p>
                <div className="templates-empty-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      clearAllTemplateFilters();
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : (
              <p className="templates-gallery-status">No templates are available yet.</p>
            )
          ) : (
            <>
              <div className="templates-gallery-grid">
                {galleryTemplates.map((item, index) => (
                  <div className="templates-gallery-item" key={item.id}>
                    <button
                      className={`templates-gallery-card ${item.toneClass}`}
                      onClick={() => handleCreateFromTemplate(item)}
                      onKeyDown={(event) => handleTemplateCardKeyDown(event, index)}
                      ref={(element) => { templateButtonRefs.current[index] = element; }}
                      type="button"
                    >
                      <div className="templates-gallery-preview"><div className={`templates-gallery-preview-frame ${getTemplateRatioClass(item)}`} /><span>{getTemplateRatioLabel(item)}</span></div>
                      <div className="templates-gallery-copy"><strong>{renderHighlightedTitle(item.title)}</strong><p>{item.subtitle}</p><small>{item.size}</small><span className="templates-gallery-meta"><span className="templates-gallery-category">{formatCategoryLabel(item.category)}</span><span className="templates-gallery-cta">Use template</span></span></div>
                    </button>

                    {canManageTemplates ? (
                      <div className="templates-gallery-admin" aria-label={`Manage template ${item.title}`}>
                        <button
                          className="templates-admin-button"
                          disabled={updatingTemplateId === item.id || deletingTemplateId === item.id}
                          onClick={() => { void handleTemplateEdit(item); }}
                          type="button"
                        >
                          {updatingTemplateId === item.id ? 'Saving...' : 'Edit'}
                        </button>
                        <button
                          className="templates-admin-button danger"
                          disabled={updatingTemplateId === item.id || deletingTemplateId === item.id}
                          onClick={() => { void handleTemplateDelete(item); }}
                          type="button"
                        >
                          {deletingTemplateId === item.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="templates-navigation-hint">Tip: use arrow keys to navigate template cards and press Enter to select.</p>
            </>
          )}
        </section>
      ) : (
        <div className={`${showGrid ? 'canvas-stage grid-visible' : 'canvas-stage'} ${spacePressed ? 'pan-mode' : ''}`} onPointerDown={startWorkspacePan} onPointerEnter={handleStagePointerEnter} onPointerLeave={handleStagePointerLeave} onPointerMove={handleStagePointerMove} ref={canvasStageRef}>
          <div className="active-canvas-frame" ref={activeFrameRef} style={{ transform: `translate(${workspacePan.x}px, ${workspacePan.y}px) scale(${workspaceZoom})` }}>
            <canvas ref={canvasElementRef} />
            {snapLines.map((line, index) => <div key={index} className={`snap-line snap-line-${line.direction}`} style={{ [line.direction === 'horizontal' ? 'top' : 'left']: `${line.position}px` }} />)}
            {isReadOnly ? null : resizeHandles.map((handle) => <button aria-label={`Resize from ${handle.key} corner`} className="corner-resize-handle" key={handle.key} onPointerDown={(event) => startResizeDrag(event, handle.key)} style={{ left: handle.left, top: handle.top, cursor: handle.cursor }} title="Drag to resize" type="button" />)}
            {isReadOnly ? null : cornerHandles.map((handle) => <button aria-label={`Drag ${handle.key} radius handle. Hold Ctrl to edit only this corner.`} className="corner-radius-handle" key={handle.key} onPointerDown={(event) => startCornerRadiusDrag(event, handle.key)} style={{ left: handle.left, top: handle.top, cursor: handle.cursor }} title="Drag: all corners. Ctrl+drag: only this corner." type="button" />)}
          </div>
          <div className="floating-toolbar" aria-label="Object tools"><button className={activeTool === 'select' ? 'active' : ''} disabled={isReadOnly} onClick={() => setActiveTool('select')} title="Select (V)" type="button"><MousePointer2 size={20} /><span>V</span></button><button className={activeTool === 'text' ? 'active' : ''} disabled={isReadOnly} onClick={() => setActiveTool('text')} title="Text (T)" type="button"><Type size={22} /><span>T</span></button><button className={activeTool === 'box' ? 'active' : ''} disabled={isReadOnly} onClick={() => setActiveTool('box')} title="Box (B)" type="button"><Square size={20} /><span>B</span></button><button className={activeTool === 'circle' ? 'active' : ''} disabled={isReadOnly} onClick={() => setActiveTool('circle')} title="Circle (C)" type="button"><CircleIcon size={20} /><span>C</span></button><button className={activeTool === 'shape' ? 'active' : ''} disabled={isReadOnly} onClick={() => setActiveTool('shape')} title="Shape (P)" type="button"><TriangleIcon size={20} /><span>P</span></button><button className={activeTool === 'pencil' ? 'active' : ''} disabled={isReadOnly} onClick={() => setActiveTool('pencil')} title="Pencil (D)" type="button"><PenTool size={20} /><span>D</span></button><button disabled={isReadOnly} onClick={() => fileInputRef.current?.click()} title="Image (I)" type="button"><ImagePlus size={20} /><span>I</span></button></div>
        </div>
      )}

      {templateToast ? (
        <div aria-live="polite" className="workspace-toast" role="status">
          <span>{templateToast}</span>
          <button
            className="workspace-toast-action"
            type="button"
            onClick={() => {
              const reverted = undoTemplateProjectCreation();
              if (reverted) {
                setTemplateToast('Template change reverted.');
                window.setTimeout(() => setTemplateToast(''), 1300);
              }
            }}
          >
            Undo
          </button>
        </div>
      ) : null}

      {shareModalOpen ? (
        <div className="share-modal-backdrop" role="dialog" aria-modal="true" aria-label="Share project">
          <div className="share-modal">
            <header className="share-modal-head">
              <h3>Share Project</h3>
              <button type="button" className="share-modal-close" onClick={closeShareModal}>Close</button>
            </header>
            <p className="share-modal-label">Public link</p>
            <div className="share-modal-row">
              <input className="share-modal-input" readOnly value={shareModalUrl} />
              <button type="button" className="share-modal-copy" onClick={copyShareModalLink}>Copy</button>
            </div>
            <p className="share-modal-label">Visitors</p>
            <div className="share-modal-visitors">
              {shareVisitors.length === 0 ? (
                <p className="share-modal-empty">No visitors yet.</p>
              ) : shareVisitors.map((visitor, index) => (
                <div key={`${visitor.username}-${visitor.visitedAt}-${index}`} className="share-modal-visitor">
                  <strong>{visitor.username}</strong>
                  <span>{new Date(visitor.visitedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {historyModalOpen ? (
        <div className="share-modal-backdrop" role="dialog" aria-modal="true" aria-label="Project history">
          <div className="share-modal history-modal">
            <header className="share-modal-head">
              <h3>Project History</h3>
              <button type="button" className="share-modal-close" onClick={closeHistoryModal}>Close</button>
            </header>
            <p className="share-modal-label">Branches</p>
            <div className="history-branch-list">
              {historyBranches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className={branch.isActive ? 'history-branch-btn active' : 'history-branch-btn'}
                  onClick={() => switchHistoryBranch(branch.id)}
                >
                  {branch.name} ({branch.steps}/150)
                </button>
              ))}
            </div>
            <p className="share-modal-label">Steps</p>
            <div className="share-modal-visitors">
              {historySteps.length === 0 ? (
                <p className="share-modal-empty">No history yet.</p>
              ) : historySteps.map((step) => (
                <button
                  key={step.index}
                  type="button"
                  className={step.isActive ? 'history-step-btn active' : 'history-step-btn'}
                  onClick={() => restoreHistoryStep(step.index)}
                >
                  <span>{step.label}</span>
                  <small>{new Date(step.changedAt).toLocaleString()}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
