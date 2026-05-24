import { useEffect, useState } from 'react';
import { Download, FolderOpen, LogIn, LogOut, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { ProjectRecord } from '../../api/projects';
import { formatRelativeProjectTime, isRecord } from '../../lib/editorHelpers';

type Props = {
  viewMode?: 'profile' | 'projects';
  authUser: { name: string; email: string; avatarUrl: string | null; createdAt?: string } | null;
  savedProjects: ProjectRecord[];
  projectId: string | null;
  projectRequestBusy: boolean;
  savedProjectsLoading: boolean;
  openingProjectId: string | null;
  deletingProjectId: string | null;
  openSavedProject: (id: string) => Promise<void>;
  deleteSavedProject: (id: string) => Promise<void>;
  refreshSavedProjects: () => Promise<void>;
  openAuthPage: () => void;
  logoutUser: () => void;
  openEditorWorkspace: () => void;
  saveProfileName: (name: string) => Promise<boolean>;
  saveProfileAvatar: (avatarUrl: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  formatSavedProjectDate: (value: string) => string;
  projectStatus: string;
  projectError: string;
  savedProjectsError: string;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function formatJoinDate(value?: string): string {
  if (!value) {
    return 'Unknown';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown';
  }

  return parsedDate.toLocaleDateString();
}

function getProjectPreviewMeta(project: ProjectRecord) {
  const frame = Array.isArray((project.data as { frames?: unknown[] }).frames)
    ? (project.data as { frames: unknown[] }).frames.find((entry) => isRecord(entry))
    : null;

  if (!frame || !isRecord(frame)) {
    return {
      sizeLabel: 'Custom project',
      frameName: 'No preview'
    };
  }

  const width = typeof frame.width === 'number' ? Math.round(frame.width) : null;
  const height = typeof frame.height === 'number' ? Math.round(frame.height) : null;
  const frameName = typeof frame.name === 'string' && frame.name.trim() ? frame.name.trim() : 'Canvas';

  return {
    sizeLabel: width && height ? `${width} x ${height}` : 'Custom project',
    frameName
  };
}

function formatProjectRecency(project: ProjectRecord) {
  if (project.lastOpenedAt) {
    const lastOpenedTime = new Date(project.lastOpenedAt).getTime();
    const lastUpdatedTime = new Date(project.updatedAt).getTime();
    if (!Number.isNaN(lastOpenedTime) && (Number.isNaN(lastUpdatedTime) || lastOpenedTime >= lastUpdatedTime)) {
      return formatRelativeProjectTime(project.lastOpenedAt, 'Opened');
    }
  }

  return formatRelativeProjectTime(project.updatedAt, 'Edited');
}

export function ProfilePage(props: Props) {
  const {
    viewMode = 'profile',
    authUser,
    savedProjects,
    projectId,
    projectRequestBusy,
    savedProjectsLoading,
    openingProjectId,
    deletingProjectId,
    openSavedProject,
    deleteSavedProject,
    refreshSavedProjects,
    openAuthPage,
    logoutUser,
    openEditorWorkspace,
    saveProfileName,
    saveProfileAvatar,
    changePassword,
    formatSavedProjectDate,
    projectStatus,
    projectError,
    savedProjectsError
  } = props;

  const [nameInput, setNameInput] = useState(authUser?.name ?? '');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSort, setProjectSort] = useState<'created-desc' | 'created-asc' | 'opened-desc' | 'opened-asc'>('opened-desc');
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const recentProjects = savedProjects.slice(0, 4);

  useEffect(() => {
    setNameInput(authUser?.name ?? '');
  }, [authUser?.name]);

  const normalizedProjectSearch = projectSearch.trim().toLowerCase();
  const visibleProjects = savedProjects
    .filter((project) => {
      if (!normalizedProjectSearch) {
        return true;
      }
      const name = project.name.toLowerCase();
      return name.includes(normalizedProjectSearch);
    })
    .sort((a, b) => {
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      const openedA = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
      const openedB = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;

      if (projectSort === 'created-asc') return createdA - createdB;
      if (projectSort === 'created-desc') return createdB - createdA;
      if (projectSort === 'opened-asc') return openedA - openedB;
      return openedB - openedA;
    });

  if (!authUser) {
    return (
      <section className="profile-page" aria-label="Profile page">
        <header className="profile-head">
          <h2>Profile</h2>
          <p>You are in guest mode. Sign in to manage your saved projects and personal account.</p>
        </header>

        <div className="profile-guest-card">
          <Sparkles size={20} />
          <div>
            <strong>Sign in to unlock your workspace</strong>
            <p>Get project history, secure backend export, and template management under your account.</p>
          </div>
        </div>

        <div className="profile-actions-row">
          <button className="wide-action" onClick={openAuthPage} type="button"><LogIn size={16} /> Open login page</button>
          <button className="wide-action muted-action" onClick={openEditorWorkspace} type="button"><FolderOpen size={16} /> Back to editor</button>
        </div>
      </section>
    );
  }

  if (viewMode === 'projects') {
    return (
      <section className="projects-page" aria-label="My projects page">
        <header className="projects-page-head">
          <h2>My projects</h2>
          <p>Search and manage all your saved projects.</p>
        </header>

        <section className="projects-page-controls">
          <label className="field compact-field">
            <span>Search by name</span>
            <input
              type="search"
              placeholder="Project name..."
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
            />
          </label>
          <label className="field compact-field">
            <span>Sort</span>
            <select value={projectSort} onChange={(event) => setProjectSort(event.target.value as 'created-desc' | 'created-asc' | 'opened-desc' | 'opened-asc')}>
              <option value="opened-desc">Last opened: newest</option>
              <option value="opened-asc">Last opened: oldest</option>
              <option value="created-desc">Created: newest</option>
              <option value="created-asc">Created: oldest</option>
            </select>
          </label>
          <div className="profile-actions-row">
            <button className="wide-action" disabled={savedProjectsLoading || projectRequestBusy} onClick={() => void refreshSavedProjects()} type="button"><RefreshCw size={16} /> {savedProjectsLoading ? 'Refreshing...' : 'Refresh'}</button>
            <button className="wide-action muted-action" onClick={openEditorWorkspace} type="button"><FolderOpen size={16} /> Open editor</button>
          </div>
        </section>

        <section className="projects-page-list">
          {savedProjectsLoading ? <p className="project-feedback">Loading projects...</p> : null}
          {!savedProjectsLoading && visibleProjects.length === 0 ? (
            <p className="project-feedback">No projects found for this filter.</p>
          ) : null}
          {!savedProjectsLoading ? visibleProjects.map((project) => (
            <article key={project.id} className={project.id === projectId ? 'projects-page-card active' : 'projects-page-card'}>
              <button className="projects-page-main" disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">
                <strong>{project.name}</strong>
                <span>{project.description || 'No description'}</span>
                <small>Created: {formatSavedProjectDate(project.createdAt)}</small>
                <small>Opened: {project.lastOpenedAt ? formatSavedProjectDate(project.lastOpenedAt) : 'Never opened'}</small>
              </button>
              <div className="profile-project-actions">
                <button disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">
                  {openingProjectId === project.id ? 'Opening...' : <><FolderOpen size={14} /> Open</>}
                </button>
                <button disabled={projectRequestBusy} onClick={() => void deleteSavedProject(project.id)} type="button">
                  {deletingProjectId === project.id ? 'Deleting...' : <><Trash2 size={14} /> Delete</>}
                </button>
              </div>
            </article>
          )) : null}
        </section>

        {projectStatus ? <p className="project-feedback success">{projectStatus}</p> : null}
        {projectError ? <p className="project-feedback error">{projectError}</p> : null}
        {savedProjectsError ? <p className="project-feedback error">{savedProjectsError}</p> : null}
      </section>
    );
  }

  const normalizedName = nameInput.trim();
  const nameChanged = normalizedName !== authUser.name.trim();
  const nameValidationError = normalizedName.length < 2 ? 'Name must be at least 2 characters.' : '';

  const handleSaveName = async () => {
    if (savingName) {
      return;
    }
    if (nameValidationError || !nameChanged) {
      return;
    }

    setSavingName(true);
    setProfileError('');
    const success = await saveProfileName(normalizedName);
    if (!success) {
      setProfileError('Could not save display name. Try again.');
    }
    setSavingName(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setProfileError('Avatar must be smaller than 1 MB.');
      return;
    }

    const toDataUrl = () => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Failed to read avatar file.'));
      };
      reader.onerror = () => reject(new Error('Failed to read avatar file.'));
      reader.readAsDataURL(file);
    });

    try {
      setSavingAvatar(true);
      setProfileError('');
      const avatarDataUrl = await toDataUrl();
      const success = await saveProfileAvatar(avatarDataUrl);
      if (!success) {
        setProfileError('Could not save avatar. Try again.');
      }
    } catch {
      setProfileError('Could not read avatar file. Try another image.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true);
    setProfileError('');
    const success = await saveProfileAvatar('');
    if (!success) {
      setProfileError('Could not remove avatar. Try again.');
    }
    setSavingAvatar(false);
  };

  const passwordValidationError = passwordNext.length > 0 && passwordNext.length < 8
    ? 'New password must be at least 8 characters.'
    : passwordConfirm.length > 0 && passwordConfirm !== passwordNext
      ? 'Password confirmation does not match.'
      : '';

  const canSubmitPassword =
    passwordCurrent.length >= 8 && passwordNext.length >= 8 && passwordConfirm === passwordNext && passwordNext !== passwordCurrent;

  const handleChangePassword = async () => {
    if (!canSubmitPassword || changingPassword) {
      return;
    }

    setChangingPassword(true);
    setProfileError('');
    const success = await changePassword(passwordCurrent, passwordNext);
    if (!success) {
      setProfileError('Could not change password. Check current password and try again.');
    } else {
      setPasswordCurrent('');
      setPasswordNext('');
      setPasswordConfirm('');
    }
    setChangingPassword(false);
  };

  return (
    <section className="profile-page" aria-label="Profile page">
      <header className="profile-head">
        <h2>Your profile</h2>
        <p>Manage your account and quickly open saved projects.</p>
      </header>

      <section className="profile-identity-card">
        {authUser.avatarUrl ? <img alt="Profile avatar" className="profile-avatar-image" src={authUser.avatarUrl} /> : <div className="profile-avatar" aria-hidden>{getInitials(authUser.name)}</div>}
        <div className="profile-identity-copy">
          <strong>{authUser.name}</strong>
          <span>{authUser.email}</span>
          <small>Joined {formatJoinDate(authUser.createdAt)}</small>
        </div>
        <div className="profile-identity-stats">
          <span>{savedProjects.length}</span>
          <small>projects</small>
        </div>
      </section>

      <section className="profile-avatar-card">
        <div className="profile-avatar-actions">
          <label className="wide-action" aria-label="Upload avatar">
            {savingAvatar ? 'Saving avatar...' : 'Upload avatar'}
            <input accept="image/png,image/jpeg,image/jpg,image/webp" hidden onChange={handleAvatarUpload} type="file" />
          </label>
          <button className="wide-action muted-action" disabled={savingAvatar || !authUser.avatarUrl} onClick={() => { void handleRemoveAvatar(); }} type="button">Remove avatar</button>
        </div>
      </section>

      <section className="profile-name-card">
        <label className="field compact-field">
          <span>Display name</span>
          <input
            maxLength={120}
            onChange={(event) => setNameInput(event.target.value)}
            type="text"
            value={nameInput}
          />
        </label>
        <div className="profile-name-actions">
          <button
            className="wide-action"
            disabled={savingName || Boolean(nameValidationError) || !nameChanged}
            onClick={() => { void handleSaveName(); }}
            type="button"
          >
            {savingName ? 'Saving...' : 'Save name'}
          </button>
          {nameValidationError ? <p className="project-feedback error">{nameValidationError}</p> : null}
          {profileError ? <p className="project-feedback error">{profileError}</p> : null}
        </div>
      </section>

      <div className="profile-actions-row">
        <button className="wide-action" disabled={savedProjectsLoading || projectRequestBusy} onClick={() => void refreshSavedProjects()} type="button"><RefreshCw size={16} /> {savedProjectsLoading ? 'Refreshing...' : 'Refresh projects'}</button>
        <button className="wide-action muted-action" onClick={openEditorWorkspace} type="button"><FolderOpen size={16} /> Open editor</button>
        <button className="wide-action muted-action" onClick={logoutUser} type="button"><LogOut size={16} /> Logout</button>
      </div>

      <section className="profile-password-card">
        <h3>Change password</h3>
        <label className="field compact-field">
          <span>Current password</span>
          <input autoComplete="current-password" onChange={(event) => setPasswordCurrent(event.target.value)} type="password" value={passwordCurrent} />
        </label>
        <label className="field compact-field">
          <span>New password</span>
          <input autoComplete="new-password" onChange={(event) => setPasswordNext(event.target.value)} type="password" value={passwordNext} />
        </label>
        <label className="field compact-field">
          <span>Confirm new password</span>
          <input autoComplete="new-password" onChange={(event) => setPasswordConfirm(event.target.value)} type="password" value={passwordConfirm} />
        </label>
        <button className="wide-action" disabled={!canSubmitPassword || changingPassword || Boolean(passwordValidationError)} onClick={() => { void handleChangePassword(); }} type="button">
          {changingPassword ? 'Updating password...' : 'Update password'}
        </button>
        {passwordValidationError ? <p className="project-feedback error">{passwordValidationError}</p> : null}
      </section>

      {projectStatus ? <p className="project-feedback success">{projectStatus}</p> : null}
      {projectError ? <p className="project-feedback error">{projectError}</p> : null}
      {savedProjectsError ? <p className="project-feedback error">{savedProjectsError}</p> : null}

      <section className="profile-projects-card">
        <div className="profile-projects-head">
          <h3>Recent projects</h3>
          <small>{recentProjects.length} shown</small>
        </div>

        {savedProjectsLoading ? <p className="project-feedback">Loading recent projects...</p> : null}
        {!savedProjectsLoading && recentProjects.length === 0 ? (
          <p className="project-feedback">No recent projects yet. Open or save a project to continue editing faster next time.</p>
        ) : null}

        {!savedProjectsLoading && recentProjects.length > 0 ? (
          <div className="profile-recent-grid">
            {recentProjects.map((project) => {
              const preview = getProjectPreviewMeta(project);

              return (
                <article className={project.id === projectId ? 'profile-recent-card active' : 'profile-recent-card'} key={project.id}>
                  <button className="profile-recent-preview" disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">
                    <span>{preview.frameName}</span>
                    <strong>{preview.sizeLabel}</strong>
                  </button>
                  <div className="profile-recent-copy">
                    <strong>{project.name}</strong>
                    <span>{project.description || 'No description'}</span>
                    <small>{formatProjectRecency(project)}</small>
                  </div>
                  <div className="profile-project-actions">
                    <button disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">
                      {openingProjectId === project.id ? 'Opening...' : <><FolderOpen size={14} /> Open</>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="profile-projects-card">
        <div className="profile-projects-head">
          <h3>Your projects</h3>
          <small>{savedProjects.length} total</small>
        </div>

        <div className="profile-projects-list">
          {savedProjectsLoading ? <p className="project-feedback">Loading saved projects...</p> : null}
          {!savedProjectsLoading && savedProjects.length === 0 ? (
            <p className="project-feedback">No saved projects yet. Save your first design to see it here.</p>
          ) : null}

          {!savedProjectsLoading ? savedProjects.map((project) => (
            <div className={project.id === projectId ? 'profile-project-row active' : 'profile-project-row'} key={project.id}>
              <button className="profile-project-main" disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">
                <strong>{project.name}</strong>
                <span>{project.description || 'No description'}</span>
                <small>{project.id === projectId ? `Currently open - ${formatSavedProjectDate(project.updatedAt)}` : formatSavedProjectDate(project.updatedAt)}</small>
              </button>
              <div className="profile-project-actions">
                <button disabled={projectRequestBusy} onClick={() => void openSavedProject(project.id)} type="button">
                  {openingProjectId === project.id ? 'Opening...' : <><FolderOpen size={14} /> Open</>}
                </button>
                <button disabled={projectRequestBusy} onClick={() => void deleteSavedProject(project.id)} type="button">
                  {deletingProjectId === project.id ? 'Deleting...' : <><Trash2 size={14} /> Delete</>}
                </button>
              </div>
            </div>
          )) : null}
        </div>
      </section>

      <section className="profile-export-note">
        <Download size={16} />
        <p>Need backend file exports? Open any project and use Server JSON/PNG/PDF actions in the Account panel.</p>
      </section>
    </section>
  );
}
