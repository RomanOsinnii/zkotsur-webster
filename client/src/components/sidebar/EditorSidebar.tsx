import type React from 'react';
import { Circle as CircleIcon, Download, GraduationCap, Grid3X3, ImagePlus, Plus, Shapes, Sparkles, Square, Triangle as TriangleIcon, Type, Upload } from 'lucide-react';
import { AuthMode, DesignFrame, GalleryTemplate, LayerItem, SidebarPanel } from '../../lib/editorTypes';
import { ProjectRecord } from '../../api/projects';

type Props = {
  isTemplatesMode: boolean;
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
  authChecking: boolean;
  authUser: { name: string; email: string } | null;
  logoutUser: () => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  resetAuthMessages: () => void;
  authName: string;
  setAuthName: (value: string) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authLoading: boolean;
  submitAuth: () => Promise<void>;
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
    isTemplatesMode, sidebarPanel, handleSidebarSelect, addFrame, frames, activeFrameId, switchFrame,
    getTemplateToneClass, getTemplatePreviewClass, presets, deleteSelectedFrame, setWorkspaceMode,
    fileInputRef, addRect, addCircle, addTriangle, addHeadingText, addSubheadingText, addBodyText,
    addText, updateFrameBackground, selectedObject, updateFill, fillColor, updateOpacity, opacity,
    activeFrame, layers, selectLayer, toggleLayerVisibility, moveLayer, authChecking, authUser,
    logoutUser, authMode, setAuthMode, resetAuthMessages, authName, setAuthName, authEmail,
    setAuthEmail, authPassword, setAuthPassword, authLoading, submitAuth, authStatus, authError,
    canManageSavedProjects, projectId, projectName, setProjectName, projectDescription,
    setProjectDescription, defaultProjectName, undoFrame, redoFrame, saveProjectToBackend,
    isSavingProject, projectRequestBusy, refreshSavedProjects, savedProjectsLoading, exportProject,
    importInputRef, importProject, projectStatus, projectError, savedProjectsError, savedProjects,
    openSavedProject, openingProjectId, deleteSavedProject, deletingProjectId, formatSavedProjectDate,
    owlMascot
  } = props;

  return (
    <aside className="sidebar" aria-label="Project tools">
      <div className="brand-block">
        <span className="brand-mark">W</span>
        <div>
          <p className="eyebrow">Webster</p>
          <h1>Design editor</h1>
        </div>
      </div>

      <nav className="sidebar-quick-nav" aria-label="Main tools">
        <button className={sidebarPanel === 'templates' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('templates')} type="button"><Grid3X3 size={18} /><span>Templates</span></button>
        <button className={sidebarPanel === 'uploads' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('uploads')} type="button"><Upload size={18} /><span>Uploads</span></button>
        <button className={sidebarPanel === 'elements' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('elements')} type="button"><Shapes size={18} /><span>Elements</span></button>
        <button className={sidebarPanel === 'text' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('text')} type="button"><Type size={18} /><span>Text</span></button>
        <button className={sidebarPanel === 'photos' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('photos')} type="button"><ImagePlus size={18} /><span>Photos</span></button>
        <button className={sidebarPanel === 'styles' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('styles')} type="button"><Sparkles size={18} /><span>Styles</span></button>
        <button className={sidebarPanel === 'learn' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('learn')} type="button"><GraduationCap size={18} /><span>Learn</span></button>
      </nav>

      {!isTemplatesMode ? (
        <>
          {sidebarPanel === 'templates' ? (
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

          {sidebarPanel === 'uploads' ? <section className="tool-section"><h2>Uploads</h2><p className="panel-caption">Add your own images to the current design.</p><button className="wide-action" onClick={() => fileInputRef.current?.click()} type="button"><Upload size={18} /> Upload image</button></section> : null}
          {sidebarPanel === 'elements' ? <section className="tool-section"><h2>Elements</h2><p className="panel-caption">Insert basic shapes and reusable visual blocks.</p><div className="icon-grid"><button onClick={addRect} type="button"><Square size={20} /><span>Box</span></button><button onClick={addCircle} type="button"><CircleIcon size={20} /><span>Circle</span></button><button onClick={addTriangle} type="button"><TriangleIcon size={20} /><span>Triangle</span></button></div></section> : null}
          {sidebarPanel === 'text' ? <section className="tool-section"><h2>Text</h2><p className="panel-caption">Drop ready-made text presets into the canvas and refine them on the right panel.</p><div className="stack-actions"><button onClick={addHeadingText} type="button">Add heading</button><button onClick={addSubheadingText} type="button">Add subheading</button><button onClick={addBodyText} type="button">Add body text</button><button onClick={addText} type="button">Add custom text</button></div></section> : null}
          {sidebarPanel === 'photos' ? <section className="tool-section"><h2>Photos</h2><p className="panel-caption">Start with your own photo asset and combine it with text or shapes.</p><button className="wide-action" onClick={() => fileInputRef.current?.click()} type="button"><ImagePlus size={18} /> Add photo</button></section> : null}
          {sidebarPanel === 'styles' ? <section className="tool-section"><h2>Styles</h2><label className="field compact-field"><span>Frame background</span><input onChange={(event) => updateFrameBackground(event.target.value)} type="color" value={activeFrame.backgroundColor ?? '#ffffff'} /></label><label className="field compact-field"><span>Selected fill</span><input disabled={!selectedObject || selectedObject.type === 'image'} onChange={(event) => updateFill(event.target.value)} type="color" value={fillColor} /></label><label className="field compact-field"><span>Selected opacity</span><input max="1" min="0" onChange={(event) => updateOpacity(Number(event.target.value))} step="0.05" type="range" value={opacity} /></label></section> : null}

          <section className="tool-section">
            <h2>Layers</h2>
            <div className="layer-tree">
              {layers.map((layer) => (
                <div className={layer.active ? 'layer-tree-row active' : 'layer-tree-row'} key={layer.id}>
                  <button className="layer-tree-main" disabled={!layer.visible} onClick={() => selectLayer(layer.index)} type="button"><strong>{layer.name}</strong><span>{layer.visible ? `${layer.type}${layer.active ? ' · selected' : ''}` : `${layer.type} · hidden`}</span></button>
                  <div className="layer-tree-actions"><button onClick={() => toggleLayerVisibility(layer.index)} type="button">{layer.visible ? 'Hide' : 'Show'}</button><button onClick={() => moveLayer(layer.index, 'up')} type="button">Up</button><button onClick={() => moveLayer(layer.index, 'down')} type="button">Down</button></div>
                </div>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <h2>Account</h2>
            {authChecking ? <p className="project-feedback">Checking session...</p> : authUser ? <div className="panel-note-card"><strong>{authUser.name}</strong><span>{authUser.email}</span><button className="wide-action muted-action" onClick={logoutUser} type="button">Logout</button></div> : <><div className="segmented-control"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); resetAuthMessages(); }} type="button">Login</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); resetAuthMessages(); }} type="button">Register</button></div>{authMode === 'register' ? <label className="field compact-field"><span>Name</span><input onChange={(event) => setAuthName(event.target.value)} placeholder="Your name" type="text" value={authName} /></label> : null}<label className="field compact-field"><span>Email</span><input onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" type="text" value={authEmail} /></label><label className="field compact-field"><span>Password</span><input onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" type="password" value={authPassword} /></label><button className="wide-action" disabled={authLoading} onClick={() => void submitAuth()} type="button">{authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}</button></>}
            {authStatus ? <p className="project-feedback success">{authStatus}</p> : null}
            {authError ? <p className="project-feedback error">{authError}</p> : null}
          </section>

          <section className="tool-section">
            <h2>Project</h2>
            <p className="project-subtitle">{canManageSavedProjects ? (projectId ? 'Update the current saved project or store a separate copy.' : 'Save this design to PostgreSQL so it can be reopened later.') : 'Log in to save projects to your account and reload them later.'}</p>
            <label className="field compact-field"><span>Project name</span><input disabled={!canManageSavedProjects} maxLength={120} onChange={(event) => setProjectName(event.target.value)} placeholder={defaultProjectName} type="text" value={projectName} /></label>
            <label className="field compact-field"><span>Description</span><textarea disabled={!canManageSavedProjects} maxLength={1000} onChange={(event) => setProjectDescription(event.target.value)} placeholder="Optional short description" rows={3} value={projectDescription} /></label>
            <div className="preset-row"><button onClick={undoFrame} title="Ctrl+Z" type="button">Undo</button><button onClick={redoFrame} title="Ctrl+Y" type="button">Redo</button></div>
            <button className="wide-action" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => void saveProjectToBackend('save')} title="Save current project to backend" type="button">{isSavingProject ? 'Saving...' : projectId ? 'Save changes' : 'Save project'}</button>
            <button className="wide-action" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => void saveProjectToBackend('save-as-new')} title="Create a new saved project in backend" type="button">{isSavingProject ? 'Saving...' : 'Save as new'}</button>
            <button className="wide-action muted-action" disabled={!canManageSavedProjects || projectRequestBusy} onClick={() => void refreshSavedProjects()} title="Refresh saved projects list" type="button">{savedProjectsLoading ? 'Refreshing...' : 'Refresh saved projects'}</button>
            <button className="wide-action" onClick={exportProject} title="Export project as Webster binary file" type="button"><Download size={18} /> Export project</button>
            <button className="wide-action" onClick={() => importInputRef.current?.click()} title="Import Webster binary project file" type="button"><Upload size={18} /> Import project</button>
            <input accept=".webster,application/octet-stream" hidden onChange={importProject} ref={importInputRef} type="file" />
            {projectStatus ? <p className="project-feedback success">{projectStatus}</p> : null}
            {projectError ? <p className="project-feedback error">{projectError}</p> : null}
            {savedProjectsError ? <p className="project-feedback error">{savedProjectsError}</p> : null}
            <div className="project-library"><div className="section-heading"><h2>Saved projects</h2></div><div className="saved-projects-list">{!canManageSavedProjects && !authChecking ? <p className="project-feedback">Log in or register to access backend project storage.</p> : null}{savedProjectsLoading ? <p className="project-feedback">Loading saved projects...</p> : canManageSavedProjects && savedProjects.length === 0 ? <p className="project-feedback">No saved projects yet. Save the current canvas to create your first backend project.</p> : canManageSavedProjects ? savedProjects.map((project) => (<div className={project.id === projectId ? 'saved-project-row active' : 'saved-project-row'} key={project.id}><button className="saved-project-main" disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button"><strong>{project.name}</strong><span>{project.description || 'No description'}</span><small>{project.id === projectId ? `Currently open · ${formatSavedProjectDate(project.updatedAt)}` : formatSavedProjectDate(project.updatedAt)}</small></button><div className="saved-project-actions"><button disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">{openingProjectId === project.id ? 'Opening...' : 'Open'}</button><button disabled={projectRequestBusy} onClick={() => void deleteSavedProject(project.id)} type="button">{deletingProjectId === project.id ? 'Deleting...' : 'Delete'}</button></div></div>)) : null}</div></div>
          </section>
        </>
      ) : null}

      <div aria-hidden className="sidebar-mascot" title="Webster owl mascot"><img alt="" className="sidebar-mascot-image" src={owlMascot} /></div>
    </aside>
  );
}

