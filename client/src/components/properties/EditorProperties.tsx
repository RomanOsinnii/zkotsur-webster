import type React from 'react';
import { PanelRightClose, Trash2 } from 'lucide-react';
import { CornerRadii, GradientStopItem, WebsterObject } from '../../lib/editorTypes';

type Props = {
  isReadOnly: boolean;
  togglePanelVisibility: () => void;
  frameWidthInput: string;
  setFrameWidthInput: (value: string) => void;
  commitFrameWidth: () => void;
  frameHeightInput: string;
  setFrameHeightInput: (value: string) => void;
  commitFrameHeight: () => void;
  activeFrame: any;
  updateFrameBackgroundMode: (mode: 'solid' | 'gradient') => void;
  updateFrameBackground: (value: string) => void;
  updateFrameBackgroundOpacity: (value: number) => void;
  getFrameStops: (frame: any) => GradientStopItem[];
  updateFrameGradientStop: (id: string, patch: Partial<Pick<GradientStopItem, 'offset' | 'color' | 'opacity'>>) => void;
  removeFrameGradientStop: (id: string) => void;
  addFrameGradientStop: () => void;
  activeName: string;
  selectedObject: WebsterObject | null;
  removeSelected: () => void;
  opacity: number;
  updateOpacity: (value: number) => void;
  strokeColor: string;
  strokeWidth: number;
  updateStrokeColor: (value: string) => void;
  updateStrokeWidth: (value: number) => void;
  rotation: number;
  updateRotation: (value: number) => void;
  elementWidth: number;
  elementHeight: number;
  updateElementWidth: (value: number) => void;
  updateElementHeight: (value: number) => void;
  updateImageCornerRadius: (value: number) => void;
  fillMode: 'solid' | 'gradient';
  applyFillMode: (mode: 'solid' | 'gradient') => void;
  fillColor: string;
  fillOpacity: number;
  updateFill: (value: string) => void;
  updateFillOpacity: (value: number) => void;
  gradientStops: GradientStopItem[];
  updateGradientStop: (id: string, patch: Partial<Pick<GradientStopItem, 'offset' | 'color' | 'opacity'>>) => void;
  removeGradientStop: (id: string) => void;
  addGradientStop: () => void;
  canEditCorners: boolean;
  cornerFields: { key: keyof CornerRadii; label: string }[];
  cornerRadii: CornerRadii;
  updateCornerRadius: (corner: keyof CornerRadii, value: number) => void;
  isTextSelected: boolean;
  fontFamily: string;
  fontOptions: { label: string; value: string }[];
  updateFontFamily: (value: string) => void;
  fontSize: number;
  updateFontSize: (value: number) => void;
  textAlign: 'left' | 'center' | 'right';
  updateTextAlign: (align: 'left' | 'center' | 'right') => void;
};

export function EditorProperties(props: Props) {
  const {
    isReadOnly,
    togglePanelVisibility,
    frameWidthInput,
    setFrameWidthInput,
    commitFrameWidth,
    frameHeightInput,
    setFrameHeightInput,
    commitFrameHeight,
    activeFrame,
    updateFrameBackgroundMode,
    updateFrameBackground,
    updateFrameBackgroundOpacity,
    getFrameStops,
    updateFrameGradientStop,
    removeFrameGradientStop,
    addFrameGradientStop,
    activeName,
    selectedObject,
    removeSelected,
    opacity,
    updateOpacity,
    strokeColor,
    strokeWidth,
    updateStrokeColor,
    updateStrokeWidth,
    rotation,
    updateRotation,
    elementWidth,
    elementHeight,
    updateElementWidth,
    updateElementHeight,
    updateImageCornerRadius,
    fillMode,
    applyFillMode,
    fillColor,
    fillOpacity,
    updateFill,
    updateFillOpacity,
    gradientStops,
    updateGradientStop,
    removeGradientStop,
    addGradientStop,
    canEditCorners,
    cornerFields,
    cornerRadii,
    updateCornerRadius,
    isTextSelected,
    fontFamily,
    fontOptions,
    updateFontFamily,
    fontSize,
    updateFontSize,
    textAlign,
    updateTextAlign
  } = props;
  const isImageSelected = selectedObject?.type === 'image';
  const maxBorderWidth = Math.max(0, Math.floor(Math.min(elementWidth, elementHeight) / 2));

  return (
    <aside className="properties" aria-label="Object properties">
      <button
        aria-label="Hide right panel"
        className="properties-collapse-handle"
        onClick={togglePanelVisibility}
        title="Hide right panel"
        type="button"
      >
        <PanelRightClose size={16} />
      </button>
      {isReadOnly ? <p className="project-feedback">Shared project preview is read-only.</p> : null}
      <fieldset disabled={isReadOnly}>
        <section className="tool-section">
          <h2>Frame</h2>
          <div className="size-row">
            <label className="field compact-field">
              <span>Width</span>
              <input
                min="100"
                onBlur={commitFrameWidth}
                onChange={(event) => setFrameWidthInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitFrameWidth();
                }}
                type="number"
                value={frameWidthInput}
              />
            </label>
            <label className="field compact-field">
              <span>Height</span>
              <input
                min="100"
                onBlur={commitFrameHeight}
                onChange={(event) => setFrameHeightInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitFrameHeight();
                }}
                type="number"
                value={frameHeightInput}
              />
            </label>
          </div>

          <div className="segmented-control">
            <button
              className={(activeFrame.backgroundMode ?? 'solid') === 'solid' ? 'active' : ''}
              onClick={() => updateFrameBackgroundMode('solid')}
              type="button"
            >
              Solid
            </button>
            <button
              className={activeFrame.backgroundMode === 'gradient' ? 'active' : ''}
              onClick={() => updateFrameBackgroundMode('gradient')}
              type="button"
            >
              Gradient
            </button>
          </div>

          {(activeFrame.backgroundMode ?? 'solid') === 'solid' ? (
            <div className="paint-row">
              <input onChange={(event) => updateFrameBackground(event.target.value)} type="color" value={activeFrame.backgroundColor ?? '#ffffff'} />
              <input
                aria-label="Frame fill opacity"
                max="100"
                min="0"
                onChange={(event) => updateFrameBackgroundOpacity(Number(event.target.value) / 100)}
                type="number"
                value={Math.round((activeFrame.backgroundOpacity ?? 1) * 100)}
              />
              <span>%</span>
            </div>
          ) : (
            <div className="gradient-stop-list">
              {getFrameStops(activeFrame).map((stop) => (
                <div className="gradient-stop-row" key={stop.id}>
                  <input
                    aria-label="Frame stop offset"
                    max="100"
                    min="0"
                    onChange={(event) => updateFrameGradientStop(stop.id, { offset: Number(event.target.value) / 100 })}
                    type="number"
                    value={Math.round(stop.offset * 100)}
                  />
                  <input onChange={(event) => updateFrameGradientStop(stop.id, { color: event.target.value })} type="color" value={stop.color} />
                  <input
                    aria-label="Frame stop opacity"
                    max="100"
                    min="0"
                    onChange={(event) => updateFrameGradientStop(stop.id, { opacity: Number(event.target.value) / 100 })}
                    type="number"
                    value={Math.round(stop.opacity * 100)}
                  />
                  <span>%</span>
                  <button disabled={getFrameStops(activeFrame).length <= 2} onClick={() => removeFrameGradientStop(stop.id)} type="button">-</button>
                </div>
              ))}
              <button className="wide-action" onClick={addFrameGradientStop} type="button">Add stop</button>
            </div>
          )}
        </section>

        <section className="tool-section">
          <h2>Selection</h2>
          <div className="selection-card">
            <span>{activeName}</span>
            <button disabled={!selectedObject} onClick={removeSelected} title="Delete selected object (Del)" type="button">
              <Trash2 size={18} />
            </button>
          </div>
        </section>

        {selectedObject ? (
          <section className="tool-section">
            <h2>Appearance</h2>
            <label className="field">
              <span>Opacity</span>
              <input max="1" min="0" onChange={(event) => updateOpacity(Number(event.target.value))} step="0.05" type="range" value={opacity} />
            </label>

            <div className="size-row">
              <label className="field compact-field">
                <span>Width</span>
                <input min="1" onChange={(event) => updateElementWidth(Number(event.target.value))} type="number" value={elementWidth} />
              </label>
              <label className="field compact-field">
                <span>Height</span>
                <input min="1" onChange={(event) => updateElementHeight(Number(event.target.value))} type="number" value={elementHeight} />
              </label>
            </div>

            <div className="size-row">
              <label className="field compact-field">
                <span>Border</span>
                <input max={maxBorderWidth} min="0" onChange={(event) => updateStrokeWidth(Number(event.target.value))} type="number" value={strokeWidth} />
              </label>
              <label className="field compact-field">
                <span>Border color</span>
                <input disabled={!selectedObject} onChange={(event) => updateStrokeColor(event.target.value)} type="color" value={strokeColor} />
              </label>
            </div>

            <label className="field compact-field">
              <span>Rotation</span>
              <input max="360" min="-360" onChange={(event) => updateRotation(Number(event.target.value))} type="number" value={Math.round(rotation)} />
            </label>

            {isImageSelected ? (
              <label className="field compact-field">
                <span>Image radius</span>
                <input min="0" onChange={(event) => updateImageCornerRadius(Number(event.target.value))} type="number" value={Math.round(cornerRadii.topLeft)} />
              </label>
            ) : null}
          </section>
        ) : null}

        {selectedObject ? (
          <section className="tool-section">
            <h2>Fill</h2>
            <div className="segmented-control">
              <button
                className={fillMode === 'solid' ? 'active' : ''}
                disabled={!selectedObject || selectedObject.type === 'image'}
                onClick={() => applyFillMode('solid')}
                type="button"
              >
                Solid
              </button>
              <button
                className={fillMode === 'gradient' ? 'active' : ''}
                disabled={!selectedObject || selectedObject.type === 'image'}
                onClick={() => applyFillMode('gradient')}
                type="button"
              >
                Gradient
              </button>
            </div>

            {fillMode === 'solid' ? (
              <div className="paint-row">
                <input onChange={(event) => updateFill(event.target.value)} type="color" value={fillColor} />
                <input
                  aria-label="Fill opacity"
                  max="100"
                  min="0"
                  onChange={(event) => updateFillOpacity(Number(event.target.value) / 100)}
                  type="number"
                  value={Math.round(fillOpacity * 100)}
                />
                <span>%</span>
              </div>
            ) : (
              <div className="gradient-stop-list">
                {gradientStops.map((stop) => (
                  <div className="gradient-stop-row" key={stop.id}>
                    <input
                      aria-label="Stop offset"
                      max="100"
                      min="0"
                      onChange={(event) => updateGradientStop(stop.id, { offset: Number(event.target.value) / 100 })}
                      type="number"
                      value={Math.round(stop.offset * 100)}
                    />
                    <input onChange={(event) => updateGradientStop(stop.id, { color: event.target.value })} type="color" value={stop.color} />
                    <input
                      aria-label="Stop opacity"
                      max="100"
                      min="0"
                      onChange={(event) => updateGradientStop(stop.id, { opacity: Number(event.target.value) / 100 })}
                      type="number"
                      value={Math.round(stop.opacity * 100)}
                    />
                    <span>%</span>
                    <button disabled={gradientStops.length <= 2} onClick={() => removeGradientStop(stop.id)} type="button">-</button>
                  </div>
                ))}
                <button className="wide-action" onClick={addGradientStop} type="button">Add stop</button>
              </div>
            )}
          </section>
        ) : null}

        {canEditCorners ? (
          <section className="tool-section">
            <h2>Corner radius</h2>
            <div className="corner-grid">
              {cornerFields.map((field) => (
                <label className="field compact-field" key={field.key}>
                  <span>{field.label}</span>
                  <input min="0" onChange={(event) => updateCornerRadius(field.key, Number(event.target.value))} type="number" value={cornerRadii[field.key]} />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {isTextSelected ? (
          <section className="tool-section">
            <h2>Typography</h2>
            <label className="field">
              <span>Font</span>
              <select onChange={(event) => updateFontFamily(event.target.value)} value={fontFamily}>
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Font size</span>
              <div className="font-size-row">
                <input max="120" min="8" onChange={(event) => updateFontSize(Number(event.target.value))} type="range" value={fontSize} />
                <input aria-label="Font size in pixels" max="480" min="1" onChange={(event) => updateFontSize(Number(event.target.value))} type="number" value={fontSize} />
              </div>
              <strong>{fontSize}px</strong>
            </label>

            <label className="field">
              <span>Align</span>
              <div className="align-buttons">
                <button className={textAlign === 'left' ? 'active' : ''} onClick={() => updateTextAlign('left')} type="button">Left</button>
                <button className={textAlign === 'center' ? 'active' : ''} onClick={() => updateTextAlign('center')} type="button">Center</button>
                <button className={textAlign === 'right' ? 'active' : ''} onClick={() => updateTextAlign('right')} type="button">Right</button>
              </div>
            </label>
          </section>
        ) : null}
      </fieldset>
    </aside>
  );
}
