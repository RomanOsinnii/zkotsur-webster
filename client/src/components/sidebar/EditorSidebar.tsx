import type React from 'react';
import { ArrowRight, Circle as CircleIcon, FolderOpen, Grid3X3, ImagePlus, Layers, Moon, PenTool, Shapes, Square, Sun, Triangle as TriangleIcon, Type, UserRound } from 'lucide-react';
import { DesignFrame, GalleryTemplate, LayerItem, SidebarPanel } from '../../lib/editorTypes';
import { ProjectRecord } from '../../api/projects';
import { ThemeMode } from '../../lib/theme';

type Props = {
    isReadOnly: boolean;
    theme: ThemeMode;
    toggleTheme: () => void;
    isTemplatesMode: boolean;
    isAccountView: boolean;
    isProfileView: boolean;
    isProjectsView: boolean;
    sidebarPanel: SidebarPanel;
    handleSidebarSelect: (panel: SidebarPanel) => void;
    addFrame: (preset?: { name: string; description: string; width: number; height: number }) => void;
    frames: DesignFrame[];
    activeFrameId: string;
    switchFrame: (id: string) => void;
    viewFrameReadOnly: (id: string) => void;
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
    authUser: { name: string; email: string; avatarUrl?: string | null } | null;
    logoutUser: () => void;
    openAuthPage: () => void;
    authStatus: string;
    authError: string;
    canManageSavedProjects: boolean;
    isProjectShared: boolean;
    projectId: string | null;
    projectName: string;
    setProjectName: (value: string) => void;
    projectDescription: string;
    setProjectDescription: (value: string) => void;
    defaultProjectName: string;
    undoFrame: () => void;
    redoFrame: () => void;
    shareProject: () => Promise<void>;
    copySharedProjectToDrafts: () => Promise<void>;
    disableProjectShare: () => Promise<void>;
    shareBusy: boolean;
    shareStatus: string;
    shareError: string;
    isSavingProject: boolean;
    projectRequestBusy: boolean;
    refreshSavedProjects: () => Promise<void>;
    savedProjectsLoading: boolean;
    exportProjectFromBackend: (format: 'json') => Promise<void>;
    projectError: string;
    savedProjectsError: string;
    savedProjects: ProjectRecord[];
    openSavedProject: (id: string) => Promise<void>;
    openingProjectId: string | null;
    deleteSavedProject: (id: string) => Promise<void>;
    deletingProjectId: string | null;
    formatSavedProjectDate: (value: string) => string;
    owlMascot: string;
    openEditorRoute: (projectId?: string | null) => void;
    openTemplatesRoute: () => void;
    openProjectsRoute: () => void;
    openProfileRoute: () => void;
};

export function EditorSidebar(props: Props) {
    const {
        isReadOnly,
        theme,
        toggleTheme,
        isTemplatesMode,
        isAccountView,
        isProfileView,
        isProjectsView,
        sidebarPanel,
        handleSidebarSelect,
        addFrame,
        frames,
        activeFrameId,
        switchFrame,
        viewFrameReadOnly,
        getTemplateToneClass,
        getTemplatePreviewClass,
        presets,
        deleteSelectedFrame,
        setWorkspaceMode,
        fileInputRef,
        addRect,
        addCircle,
        addTriangle,
        addArrow,
        addHeadingText,
        addSubheadingText,
        addBodyText,
        addText,
        updateFrameBackground,
        selectedObject,
        updateFill,
        fillColor,
        updateOpacity,
        opacity,
        activeFrame,
        layers,
        selectLayer,
        toggleLayerVisibility,
        moveLayer,
        authUser,
        logoutUser,
        openAuthPage,
        authStatus,
        authError,
        canManageSavedProjects,
        isProjectShared,
        projectId,
        projectName,
        setProjectName,
        projectDescription,
        setProjectDescription,
        defaultProjectName,
        undoFrame,
        redoFrame,
        shareProject,
        copySharedProjectToDrafts,
        disableProjectShare,
        shareBusy,
        shareStatus,
        shareError,
        isSavingProject,
        projectRequestBusy,
        refreshSavedProjects,
        savedProjectsLoading,
        exportProjectFromBackend,
        projectError,
        savedProjectsError,
        savedProjects,
        openSavedProject,
        openingProjectId,
        deleteSavedProject,
        deletingProjectId,
        formatSavedProjectDate,
        owlMascot,
        openEditorRoute,
        openTemplatesRoute,
        openProjectsRoute,
        openProfileRoute,
    } = props;

    const userInitials = authUser
        ? authUser.name
              .split(' ')
              .map((part) => part.trim())
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('')
        : 'G';

    const openEditorPanel = (panel: SidebarPanel) => {
        if (panel === 'templates') {
            if (isReadOnly) {
                setWorkspaceMode('editor');
                handleSidebarSelect(panel);
                return;
            }
            openEditorRoute(projectId);
            return;
        }

        setWorkspaceMode('editor');
        handleSidebarSelect(panel);
    };

    const openTemplatesMode = () => {
        openTemplatesRoute();
    };

    const openProfileMode = () => {
        openProfileRoute();
    };

    const openProjectsMode = () => {
        openProjectsRoute();
    };

    const showEditorPanels = !isReadOnly && !isTemplatesMode && !isAccountView;
    const showReadOnlyFramePanel = isReadOnly && !isTemplatesMode && !isAccountView;
    const showAccountPanel = !isTemplatesMode && (isReadOnly || isAccountView || sidebarPanel === 'account');
    const isEditorHomeActive = !isTemplatesMode && !isAccountView;

    return (
        <aside className="sidebar" aria-label="Project tools">
            <div className="brand-block">
                <span className="brand-mark">W</span>
                <div>
                    <p className="eyebrow">Webster</p>
                    <h1>Design editor</h1>
                </div>
                <button aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="theme-toggle sidebar-theme-toggle" onClick={toggleTheme} type="button">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
            </div>

            <p className="sidebar-nav-label">Workspace</p>
            <nav className="sidebar-quick-nav workspace-nav" aria-label="Workspace navigation">
                <button className={isEditorHomeActive ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => openEditorPanel('templates')} type="button">
                    <PenTool size={18} />
                    <span>Editor</span>
                </button>
                <button className={isTemplatesMode ? 'quick-nav-item active' : 'quick-nav-item'} onClick={openTemplatesMode} type="button">
                    <Grid3X3 size={18} />
                    <span>Templates</span>
                </button>
                <button className={isProfileView ? 'quick-nav-item active' : 'quick-nav-item'} onClick={openProfileMode} type="button">
                    <UserRound size={18} />
                    <span>Profile</span>
                </button>
                <button className={isProjectsView ? 'quick-nav-item active' : 'quick-nav-item'} onClick={openProjectsMode} type="button">
                    <FolderOpen size={18} />
                    <span>My projects</span>
                </button>
            </nav>

            {showEditorPanels ? (
                <>
                    <p className="sidebar-nav-label">Editor tools</p>
                    <nav className="sidebar-quick-nav tools-nav" aria-label="Editor tools">
                        <button className={sidebarPanel === 'elements' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('elements')} type="button">
                            <Shapes size={18} />
                            <span>Elements</span>
                        </button>
                        <button className={sidebarPanel === 'text' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('text')} type="button">
                            <Type size={18} />
                            <span>Text</span>
                        </button>
                        <button className={sidebarPanel === 'photos' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('photos')} type="button">
                            <ImagePlus size={18} />
                            <span>Photos</span>
                        </button>
                        <button className={sidebarPanel === 'layers' ? 'quick-nav-item active' : 'quick-nav-item'} onClick={() => handleSidebarSelect('layers')} type="button">
                            <Layers size={18} />
                            <span>Layers</span>
                        </button>
                    </nav>
                </>
            ) : null}

            {isTemplatesMode ? (
                <section className="tool-section">
                    <h2>Template workspace</h2>
                    <p className="panel-caption">Choose a template, start a fresh design, or jump to your profile page.</p>
                    {authUser ? (
                        <button className="wide-action sidebar-btn-danger" onClick={logoutUser} type="button">
                            Logout
                        </button>
                    ) : (
                        <button className="wide-action sidebar-btn-secondary" onClick={openAuthPage} type="button">
                            Open login page
                        </button>
                    )}
                    {authStatus ? <p className="project-feedback success">{authStatus}</p> : null}
                    {authError ? <p className="project-feedback error">{authError}</p> : null}
                </section>
            ) : (
                <>
                    {showEditorPanels && sidebarPanel === 'templates' ? (
                        <section className="tool-section">
                            <h2>Templates</h2>
                            <p className="panel-caption">Choose one template/frame at a time from the list.</p>
                            <div className="template-simple-list" role="listbox" aria-label="Template list">
                                {frames.map((frame) => (
                                    <button
                                        aria-selected={frame.id === activeFrameId}
                                        className={frame.id === activeFrameId ? 'template-simple-item active' : 'template-simple-item'}
                                        key={frame.id}
                                        onClick={() => switchFrame(frame.id)}
                                        type="button"
                                    >
                                        <strong>{frame.name}</strong>
                                        <span>{frame.description}</span>
                                        <small>{frame.width} x {frame.height}</small>
                                    </button>
                                ))}
                            </div>
                            <button className="wide-action" onClick={openTemplatesMode} type="button">
                                Open full template gallery
                            </button>
                        </section>
                    ) : null}

                    {showReadOnlyFramePanel ? (
                        <section className="tool-section">
                            <h2>Frames</h2>
                            <p className="panel-caption">Browse the saved frames in this shared project. Viewing is read-only.</p>
                            <div className="template-simple-list" role="listbox" aria-label="Read-only frame list">
                                {frames.map((frame) => (
                                    <button
                                        aria-selected={frame.id === activeFrameId}
                                        className={frame.id === activeFrameId ? 'template-simple-item active' : 'template-simple-item'}
                                        key={frame.id}
                                        onClick={() => viewFrameReadOnly(frame.id)}
                                        type="button"
                                    >
                                        <strong>{frame.name}</strong>
                                        <span>{frame.description}</span>
                                        <small>{frame.width} x {frame.height}</small>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {showEditorPanels && sidebarPanel === 'layers' ? (
                        <section className="tool-section">
                            <h2>Layers</h2>
                            <p className="panel-caption">Select a layer and manage visibility/order without scrolling to the bottom.</p>
                            <div className="layer-tree">
                                {layers.map((layer) => (
                                    <div className={layer.active ? 'layer-tree-row active' : 'layer-tree-row'} key={layer.id}>
                                        <button className="layer-tree-main" disabled={!layer.visible} onClick={() => selectLayer(layer.index)} type="button">
                                            <strong>{layer.name}</strong>
                                            <span>{layer.visible ? `${layer.type}${layer.active ? ' - selected' : ''}` : `${layer.type} - hidden`}</span>
                                        </button>
                                        <div className="layer-tree-actions">
                                            <button onClick={() => toggleLayerVisibility(layer.index)} type="button">
                                                {layer.visible ? 'Hide' : 'Show'}
                                            </button>
                                            <button onClick={() => moveLayer(layer.index, 'up')} type="button">
                                                Up
                                            </button>
                                            <button onClick={() => moveLayer(layer.index, 'down')} type="button">
                                                Down
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {showEditorPanels && sidebarPanel === 'elements' ? (
                        <section className="tool-section">
                            <h2>Elements</h2>
                            <p className="panel-caption">Insert basic shapes and reusable visual blocks.</p>
                            <div className="icon-grid">
                                <button onClick={addRect} type="button">
                                    <Square size={20} />
                                    <span>Box</span>
                                </button>
                                <button onClick={addCircle} type="button">
                                    <CircleIcon size={20} />
                                    <span>Circle</span>
                                </button>
                                <button onClick={addTriangle} type="button">
                                    <TriangleIcon size={20} />
                                    <span>Triangle</span>
                                </button>
                                <button onClick={addArrow} type="button">
                                    <ArrowRight size={20} />
                                    <span>Arrow</span>
                                </button>
                            </div>
                        </section>
                    ) : null}
                    {showEditorPanels && sidebarPanel === 'text' ? (
                        <section className="tool-section">
                            <h2>Text</h2>
                            <p className="panel-caption">Drop ready-made text presets into the canvas and refine them on the right panel.</p>
                            <div className="stack-actions">
                                <button onClick={addHeadingText} type="button">
                                    Add heading
                                </button>
                                <button onClick={addSubheadingText} type="button">
                                    Add subheading
                                </button>
                                <button onClick={addBodyText} type="button">
                                    Add body text
                                </button>
                                <button onClick={addText} type="button">
                                    Add custom text
                                </button>
                            </div>
                        </section>
                    ) : null}
                    {showEditorPanels && sidebarPanel === 'photos' ? (
                        <section className="tool-section">
                            <h2>Photos</h2>
                            <p className="panel-caption">Start with your own photo asset and combine it with text or shapes.</p>
                            <button className="wide-action" onClick={() => fileInputRef.current?.click()} type="button">
                                <ImagePlus size={18} /> Add photo
                            </button>
                        </section>
                    ) : null}

                    {showAccountPanel ? (
                        <section className="tool-section">
                            <h2>Account</h2>
                            {authUser ? (
                                <div className="account-profile-card">
                                    {authUser.avatarUrl ? (
                                        <img alt="Profile avatar" className="account-avatar-image" src={authUser.avatarUrl} />
                                    ) : (
                                        <div className="account-avatar" aria-hidden>
                                            {userInitials}
                                        </div>
                                    )}
                                    <div className="account-profile-copy">
                                        <strong>{authUser.name}</strong>
                                        <span>{authUser.email}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="account-profile-card guest">
                                    <div className="account-avatar" aria-hidden>
                                        {userInitials}
                                    </div>
                                    <div className="account-profile-copy">
                                        <strong>Guest mode</strong>
                                        <span>Log in to unlock backend saves and template management.</span>
                                    </div>
                                </div>
                            )}
                            {authUser ? (
                                <button className="wide-action sidebar-btn-danger" onClick={logoutUser} type="button">
                                    Logout
                                </button>
                            ) : (
                                <button className="wide-action sidebar-btn-secondary" onClick={openAuthPage} type="button">
                                    Open login page
                                </button>
                            )}
                            {projectError ? <p className="project-feedback error">{projectError}</p> : null}
                            {shareStatus ? <p className="project-feedback success">{shareStatus}</p> : null}
                            {shareError ? <p className="project-feedback error">{shareError}</p> : null}
                            {savedProjectsError ? <p className="project-feedback error">{savedProjectsError}</p> : null}
                            {authStatus ? <p className="project-feedback success">{authStatus}</p> : null}
                            {authError ? <p className="project-feedback error">{authError}</p> : null}
                        </section>
                    ) : null}
                </>
            )}
        </aside>
    );
}
