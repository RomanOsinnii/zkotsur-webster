import type React from 'react';
import { ArrowRight, Circle as CircleIcon, Download, GraduationCap, Grid3X3, Home, ImagePlus, Plus, Shapes, Sparkles, Square, Triangle as TriangleIcon, Type, Upload, UserRound } from 'lucide-react';
import { DesignFrame, GalleryTemplate, LayerItem, SidebarPanel } from '../../lib/editorTypes';
import { ProjectExportFormat, ProjectRecord } from '../../api/projects';

type Props = {
  isTemplatesMode: boolean;
  isProfileView: boolean;
  sidebarPanel: SidebarPanel;
  handleSidebarSelect: (panel: SidebarPanel) => void;
  addFrame: (preset?: { name: string; description: string; width: number; height: number }) => void;
  frames: DesignFrame[];
  activeFrameId: string;
  switchFrame: (id: string) => void;
  getTemplateToneClass: (index: number) => string;
  getTemplatePreviewClass: (frame: DesignFrame, index: number) => string;
  presets: { name: string; description: string; width: number; height: number }[];
  deleteSelectedFrame: () => void;
  setWorkspaceMode: (mode: 'templates' | 'editor') => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  addRect: () => void;
  addCircle: () => void;
  addTriangle: () => void;
  addArrow: () => void;
  addHeadingText: () => void;
  addSubheadingText: () => void;
  addBodyText: () => void;
  addText: () => void;
  updateFrameBackground: (value: string) => void;
  selectedObject: { type?: string } | null;
  updateFill: (value: string) => void;
  fillColor: string;
  updateOpacity: (value: number) => void;
  opacity: number;
  activeFrame: DesignFrame;
  layers: LayerItem[];
  selectLayer: (index: number) => void;
  toggleLayerVisibility: (index: number) => void;
  moveLayer: (index: number, direction: 'up' | 'down') => void;
  authUser: { name: string; email: string } | null;
  logoutUser: () => void;
  openAuthPage: () => void;
  authStatus: string;
  authError: string;
  canManageSavedProjects: boolean;
  projectId: string | null;
  projectName: string;
  setProjectName: (value: string) => void;
  projectDescription: string;
  setProjectDescription: (value: string) => void;
  defaultProjectName: string;
  undoFrame: () => void;
  redoFrame: () => void;
  saveProjectToBackend: (mode: 'save' | 'save-as-new') => Promise<void>;
  isSavingProject: boolean;
  projectRequestBusy: boolean;
  refreshSavedProjects: () => Promise<void>;
  savedProjectsLoading: boolean;
  exportProject: () => Promise<void>;
  exportProjectFromBackend: (format: ProjectExportFormat) => Promise<void>;
  importInputRef: React.RefObject<HTMLInputElement>;
  importProject: (event: React.ChangeEvent<HTMLInputElement>) => void;
  projectStatus: string;
  projectError: string;
  savedProjectsError: string;
  savedProjects: ProjectRecord[];
  openSavedProject: (id: string) => Promise<void>;
  openingProjectId: string | null;
  deleteSavedProject: (id: string) => Promise<void>;
  deletingProjectId: string | null;
  formatSavedProjectDate: (value: string) => string;
  owlMascot: string;
};

export function EditorSidebar(props: Props) {
  const {
    isTemplatesMode, isProfileView, sidebarPanel, handleSidebarSelect, addFrame, frames, activeFrameId, switchFrame,
    getTemplateToneClass, getTemplatePreviewClass, presets, deleteSelectedFrame, setWorkspaceMode,
    fileInputRef, addRect, addCircle, addTriangle, addArrow, addHeadingText, addSubheadingText, addBodyText,
    addText, updateFrameBackground, selectedObject, updateFill, fillColor, updateOpacity, opacity,
    activeFrame, layers, selectLayer, toggleLayerVisibility, moveLayer, authUser,
    logoutUser, openAuthPage, authStatus, authError,
    canManageSavedProjects, projectId, projectName, setProjectName, projectDescription,
    setProjectDescription, defaultProjectName, undoFrame, redoFrame, saveProjectToBackend,
    isSavingProject, projectRequestBusy, refreshSavedProjects, savedProjectsLoading, exportProject, exportProjectFromBackend,
    importInputRef, importProject, projectStatus, projectError, savedProjectsError, savedProjects,
    openSavedProject, openingProjectId, deleteSavedProject, deletingProjectId, formatSavedProjectDate,
    owlMascot
  } = props;

  const userInitials = authUser
    ? authUser.name.split(' ').map((part) => part.trim()).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
    : 'G';

  const openEditorPanel = (panel: SidebarPanel) => {
    setWorkspaceMode('editor');
    handleSidebarSelect(panel);
  };

  const openTemplatesMode = () => {
    setWorkspaceMode('templates');
    handleSidebarSelect('templates');
  };

  const openProfileMode = () => {
    setWorkspaceMode('editor');
    handleSidebarSelect('account');
  };

  const showEditorPanels = !isTemplatesMode && !isProfileView;
  const showAccountPanel = !isTemplatesMode && (isProfileView || sidebarPanel === 'account');
  const isEditorHomeActive = !isTemplatesMode && !isProfileView;

  return (
    <aside className="sidebar" aria-label="Project tools">
      <div className="brand-block">
        <span className="brand-mark">W</span>
        <div>
          <p className="eyebrow">Webster</p>
          <h1>Design editor</h1>
        </div>
      </div>

      <p className="sidebar-nav-label">Workspace</p>
      <nav className="sidebar-quick-nav workspace-nav" aria-label="Workspace navigation">
        <button className={isEditorHomeActive ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => openEditorPanel('templates')} type="button"><Home size={18} /><span>Home</span></button>
        <button className={isTemplatesMode ? 'quick-nav-item active' : 'quick-nav-item'} onClick={openTemplatesMode} type="button"><Grid3X3 size={18} /><span>Templates</span></button>
        <button className={isProfileView ? 'quick-nav-item active' : 'quick-nav-item'} onClick={openProfileMode} type="button"><UserRound size={18} /><span>My projects</span></button>
      </nav>

      {showEditorPanels ? (
        <>
          <p className="sidebar-nav-label">Editor tools</p>
          <nav className="sidebar-quick-nav tools-nav" aria-label="Editor tools">
            <button className={sidebarPanel === 'uploads' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('uploads')} type="button"><Upload size={18} /><span>Uploads</span></button>
            <button className={sidebarPanel === 'elements' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('elements')} type="button"><Shapes size={18} /><span>Elements</span></button>
            <button className={sidebarPanel === 'text' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('text')} type="button"><Type size={18} /><span>Text</span></button>
            <button className={sidebarPanel === 'photos' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('photos')} type="button"><ImagePlus size={18} /><span>Photos</span></button>
            <button className={sidebarPanel === 'styles' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('styles')} type="button"><Sparkles size={18} /><span>Styles</span></button>
            <button className={sidebarPanel === 'learn' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('learn')} type="button"><GraduationCap size={18} /><span>Learn</span></button>
          </nav>
        </>
      ) : null}

      {isTemplatesMode ? (
        <section className="tool-section">
          <h2>Template workspace</h2>
          <p className="panel-caption">Choose a template, start a fresh design, or jump to your profile page.</p>
          <button className="wide-action sidebar-btn-primary" onClick={() => openEditorPanel('templates')} type="button">Open editor</button>
          <button className="wide-action sidebar-btn-secondary" onClick={openProfileMode} type="button">Open account</button>
          {authUser ? <button className="wide-action sidebar-btn-danger" onClick={logoutUser} type="button">Logout</button> : <button className="wide-action sidebar-btn-secondary" onClick={openAuthPage} type="button">Open login page</button>}
          {authStatus ? <p className="project-feedback success">{authStatus}</p> : null}
          {authError ? <p className="project-feedback error">{authError}</p> : null}
        </section>
      ) : (
        <>
          {showEditorPanels && sidebarPanel === 'templates' ? (
            <section className="tool-section">
              <div className="section-heading">
                <h2>Templates</h2>
                <button onClick={() => addFrame()} title="Add frame" type="button"><Plus size={16} /></button>
              </div>
              <p className="panel-caption">Switch frames, add a new canvas size, or jump back to the full template gallery.</p>
              <div className="template-list">
                {frames.map((frame, index) => (
                  <button className={`template-card ${getTemplateToneClass(index)}${frame.id === activeFrameId ? ' active' : ''}`} key={frame.id} onClick={() => switchFrame(frame.id)} type="button">
                    <div className="template-card-copy"><strong>{frame.name}</strong><span>{frame.description}</span><small>{frame.width} x {frame.height}</small></div>
                    <div aria-hidden className={`template-thumb ${getTemplatePreviewClass(frame, index)}`}><i className="template-thumb-canvas" /><i className="template-thumb-shape template-thumb-shape-main" /><i className="template-thumb-shape template-thumb-shape-accent" /><i className="template-thumb-badge" /></div>
                  </button>
                ))}
              </div>
              <div className="preset-row">{presets.map((preset) => <button key={preset.name} onClick={() => addFrame(preset)} type="button">{preset.name}</button>)}</div>
              <button className="wide-action muted-action" disabled={frames.length <= 1} onClick={deleteSelectedFrame} title="Delete current frame" type="button">Delete frame</button>
              <button className="wide-action" onClick={() => setWorkspaceMode('templates')} type="button">Open full template gallery</button>
            </section>
          ) : null}

          {showEditorPanels && sidebarPanel === 'uploads' ? <section className="tool-section"><h2>Uploads</h2><p className="panel-caption">Add your own images to the current design.</p><button className="wide-action" onClick={() => fileInputRef.current?.click()} type="button"><Upload size={18} /> Upload image</button></section> : null}
          {showEditorPanels && sidebarPanel === 'elements' ? <section className="tool-section"><h2>Elements</h2><p className="panel-caption">Insert basic shapes and reusable visual blocks.</p><div className="icon-grid"><button onClick={addRect} type="button"><Square size={20} /><span>Box</span></button><button onClick={addCircle} type="button"><CircleIcon size={20} /><span>Circle</span></button><button onClick={addTriangle} type="button"><TriangleIcon size={20} /><span>Triangle</span></button><button onClick={addArrow} type="button"><ArrowRight size={20} /><span>Arrow</span></button></div></section> : null}
          {showEditorPanels && sidebarPanel === 'text' ? <section className="tool-section"><h2>Text</h2><p className="panel-caption">Drop ready-made text presets into the canvas and refine them on the right panel.</p><div className="stack-actions"><button onClick={addHeadingText} type="button">Add heading</button><button onClick={addSubheadingText} type="button">Add subheading</button><button onClick={addBodyText} type="button">Add body text</button><button onClick={addText} type="button">Add custom text</button></div></section> : null}
          {showEditorPanels && sidebarPanel === 'photos' ? <section className="tool-section"><h2>Photos</h2><p className="panel-caption">Start with your own photo asset and combine it with text or shapes.</p><button className="wide-action" onClick={() => fileInputRef.current?.click()} type="button"><ImagePlus size={18} /> Add photo</button></section> : null}
          {showEditorPanels && sidebarPanel === 'styles' ? <section className="tool-section"><h2>Styles</h2><label className="field compact-field"><span>Frame background</span><input onChange={(event) => updateFrameBackground(event.target.value)} type="color" value={activeFrame.backgroundColor ?? '#ffffff'} /></label><label className="field compact-field"><span>Selected fill</span><input disabled={!selectedObject || selectedObject.type === 'image'} onChange={(event) => updateFill(event.target.value)} type="color" value={fillColor} /></label><label className="field compact-field"><span>Selected opacity</span><input max="1" min="0" onChange={(event) => updateOpacity(Number(event.target.value))} step="0.05" type="range" value={opacity} /></label></section> : null}

          {showEditorPanels ? <section className="tool-section">
            <h2>Layers</h2>
            <div className="layer-tree">
              {layers.map((layer) => (
                <div className={layer.active ? 'layer-tree-row active' : 'layer-tree-row'} key={layer.id}>
                  <button className="layer-tree-main" disabled={!layer.visible} onClick={() => selectLayer(layer.index)} type="button"><strong>{layer.name}</strong><span>{layer.visible ? `${layer.type}${layer.active ? ' � selected' : ''}` : `${layer.type} � hidden`}</span></button>
                  <div className="layer-tree-actions"><button onClick={() => toggleLayerVisibility(layer.index)} type="button">{layer.visible ? 'Hide' : 'Show'}</button><button onClick={() => moveLayer(layer.index, 'up')} type="button">Up</button><button onClick={() => moveLayer(layer.index, 'down')} type="button">Down</button></div>
                </div>
              ))}
            </div>
          </section> : null}

          {showAccountPanel ? (
            <section className="tool-section">
              <h2>Account</h2>
              {authUser ? <div className="account-profile-card"><div className="account-avatar" aria-hidden>{userInitials}</div><div className="account-profile-copy"><strong>{authUser.name}</strong><span>{authUser.email}</span></div></div> : <div className="account-profile-card guest"><div className="account-avatar" aria-hidden>{userInitials}</div><div className="account-profile-copy"><strong>Guest mode</strong><span>Log in to unlock backend saves and template management.</span></div></div>}
              <p className="panel-caption">Profile details are shown in the center page. Project actions stay available here for quick access.</p>

              <div className="stack-actions">
                <button className="sidebar-btn-primary" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => { void saveProjectToBackend('save'); }} type="button">{isSavingProject ? 'Saving...' : 'Save project'}</button>
                <button className="sidebar-btn-secondary" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => { void saveProjectToBackend('save-as-new'); }} type="button">Save as new copy</button>
                <button disabled={projectRequestBusy} onClick={() => { void exportProject(); }} type="button">Export .webster</button>
                <button disabled={projectRequestBusy} onClick={() => importInputRef.current?.click()} type="button">Import .webster</button>
                <button className="sidebar-btn-secondary" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => { void exportProjectFromBackend('json'); }} type="button">Export JSON</button>
                <button className="sidebar-btn-secondary" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => { void exportProjectFromBackend('png'); }} type="button">Export PNG</button>
                <button className="sidebar-btn-secondary" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => { void exportProjectFromBackend('pdf'); }} type="button">Export PDF</button>
              </div>

              {authUser ? <button className="wide-action sidebar-btn-danger" onClick={logoutUser} type="button">Logout</button> : <button className="wide-action sidebar-btn-secondary" onClick={openAuthPage} type="button">Open login page</button>}
              {projectStatus ? <p className="project-feedback success">{projectStatus}</p> : null}
              {projectError ? <p className="project-feedback error">{projectError}</p> : null}
              {savedProjectsError ? <p className="project-feedback error">{savedProjectsError}</p> : null}
              {authStatus ? <p className="project-feedback success">{authStatus}</p> : null}
              {authError ? <p className="project-feedback error">{authError}</p> : null}
            </section>
          ) : null}
        </>
      )}

      <div aria-hidden className="sidebar-mascot" title="Webster owl mascot"><img alt="" className="sidebar-mascot-image" src={owlMascot} /></div>
    </aside>
  );
}

