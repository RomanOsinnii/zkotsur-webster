import type React from 'react';
import { Trash2 } from 'lucide-react';
import { CornerRadii, FillLayer, GradientStopItem, WebsterObject } from '../../lib/editorTypes';

type Props = {
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
  elementWidth: number;
  elementHeight: number;
  updateElementWidth: (value: number) => void;
  updateElementHeight: (value: number) => void;
  fillLayers: FillLayer[];
  activeFillLayer: FillLayer;
  selectFillLayer: (layer: FillLayer) => void;
  colorWithOpacity: (color: string, opacity: number) => string;
  createGradientPreview: (stops: GradientStopItem[]) => string;
  addFillLayer: (mode: 'solid' | 'gradient') => void;
  removeFillLayer: (id: string) => void;
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
  const { frameWidthInput, setFrameWidthInput, commitFrameWidth, frameHeightInput, setFrameHeightInput, commitFrameHeight, activeFrame, updateFrameBackgroundMode, updateFrameBackground, updateFrameBackgroundOpacity, getFrameStops, updateFrameGradientStop, removeFrameGradientStop, addFrameGradientStop, activeName, selectedObject, removeSelected, opacity, updateOpacity, elementWidth, elementHeight, updateElementWidth, updateElementHeight, fillLayers, activeFillLayer, selectFillLayer, colorWithOpacity, createGradientPreview, addFillLayer, removeFillLayer, fillMode, applyFillMode, fillColor, fillOpacity, updateFill, updateFillOpacity, gradientStops, updateGradientStop, removeGradientStop, addGradientStop, canEditCorners, cornerFields, cornerRadii, updateCornerRadius, isTextSelected, fontFamily, fontOptions, updateFontFamily, fontSize, updateFontSize, textAlign, updateTextAlign } = props;
  return (
    <aside className="properties" aria-label="Object properties">
      <section className="tool-section"><h2>Frame</h2><div className="size-row"><label className="field compact-field"><span>Width</span><input min="100" onBlur={commitFrameWidth} onChange={(event) => setFrameWidthInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitFrameWidth(); }} type="number" value={frameWidthInput} /></label><label className="field compact-field"><span>Height</span><input min="100" onBlur={commitFrameHeight} onChange={(event) => setFrameHeightInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitFrameHeight(); }} type="number" value={frameHeightInput} /></label></div><div className="segmented-control"><button className={(activeFrame.backgroundMode ?? 'solid') === 'solid' ? 'active' : ''} onClick={() => updateFrameBackgroundMode('solid')} type="button">Solid</button><button className={activeFrame.backgroundMode === 'gradient' ? 'active' : ''} onClick={() => updateFrameBackgroundMode('gradient')} type="button">Gradient</button></div>{(activeFrame.backgroundMode ?? 'solid') === 'solid' ? <div className="paint-row"><input onChange={(event) => updateFrameBackground(event.target.value)} type="color" value={activeFrame.backgroundColor ?? '#ffffff'} /><input aria-label="Frame fill opacity" max="100" min="0" onChange={(event) => updateFrameBackgroundOpacity(Number(event.target.value) / 100)} type="number" value={Math.round((activeFrame.backgroundOpacity ?? 1) * 100)} /><span>%</span></div> : <div className="gradient-stop-list">{getFrameStops(activeFrame).map((stop) => <div className="gradient-stop-row" key={stop.id}><input aria-label="Frame stop offset" max="100" min="0" onChange={(event) => updateFrameGradientStop(stop.id, { offset: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.offset * 100)} /><input onChange={(event) => updateFrameGradientStop(stop.id, { color: event.target.value })} type="color" value={stop.color} /><input aria-label="Frame stop opacity" max="100" min="0" onChange={(event) => updateFrameGradientStop(stop.id, { opacity: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.opacity * 100)} /><span>%</span><button disabled={getFrameStops(activeFrame).length <= 2} onClick={() => removeFrameGradientStop(stop.id)} type="button">-</button></div>)}<button className="wide-action" onClick={addFrameGradientStop} type="button">Add stop</button></div>}</section>
      <section className="tool-section"><h2>Selection</h2><div className="selection-card"><span>{activeName}</span><button disabled={!selectedObject} onClick={removeSelected} title="Delete selected object (Del)" type="button"><Trash2 size={18} /></button></div></section>
      <section className="tool-section"><h2>Appearance</h2><label className="field"><span>Opacity</span><input max="1" min="0" onChange={(event) => updateOpacity(Number(event.target.value))} step="0.05" type="range" value={opacity} /></label><div className="size-row"><label className="field compact-field"><span>Width</span><input min="1" onChange={(event) => updateElementWidth(Number(event.target.value))} type="number" value={elementWidth} /></label><label className="field compact-field"><span>Height</span><input min="1" onChange={(event) => updateElementHeight(Number(event.target.value))} type="number" value={elementHeight} /></label></div></section>
      <section className="tool-section"><h2>Fill</h2><div className="fill-layer-list">{fillLayers.map((layer, index) => <button className={layer.id === activeFillLayer?.id ? 'fill-layer-row active' : 'fill-layer-row'} key={layer.id} onClick={() => selectFillLayer(layer)} type="button"><span>{index === 0 ? 'Top' : `Layer ${index + 1}`}</span><strong>{layer.mode}</strong><small>{Math.round(layer.opacity * 100)}%</small><i style={{ background: layer.mode === 'solid' ? colorWithOpacity(layer.color, layer.opacity) : createGradientPreview(layer.stops) }} /></button>)}</div><div className="preset-row"><button disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => addFillLayer('solid')} type="button">+ Solid</button><button disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => addFillLayer('gradient')} type="button">+ Gradient</button><button disabled={!activeFillLayer || fillLayers.length <= 1} onClick={() => removeFillLayer(activeFillLayer.id)} type="button">Remove</button></div><div className="segmented-control"><button className={fillMode === 'solid' ? 'active' : ''} disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => applyFillMode('solid')} type="button">Solid</button><button className={fillMode === 'gradient' ? 'active' : ''} disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => applyFillMode('gradient')} type="button">Gradient</button></div>{fillMode === 'solid' ? <div className="paint-row"><input onChange={(event) => updateFill(event.target.value)} type="color" value={fillColor} /><input aria-label="Fill opacity" max="100" min="0" onChange={(event) => updateFillOpacity(Number(event.target.value) / 100)} type="number" value={Math.round(fillOpacity * 100)} /><span>%</span></div> : <div className="gradient-stop-list">{gradientStops.map((stop) => <div className="gradient-stop-row" key={stop.id}><input aria-label="Stop offset" max="100" min="0" onChange={(event) => updateGradientStop(stop.id, { offset: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.offset * 100)} /><input onChange={(event) => updateGradientStop(stop.id, { color: event.target.value })} type="color" value={stop.color} /><input aria-label="Stop opacity" max="100" min="0" onChange={(event) => updateGradientStop(stop.id, { opacity: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.opacity * 100)} /><span>%</span><button disabled={gradientStops.length <= 2} onClick={() => removeGradientStop(stop.id)} type="button">-</button></div>)}<button className="wide-action" onClick={addGradientStop} type="button">Add stop</button></div>}</section>
      {canEditCorners ? <section className="tool-section"><h2>Corner radius</h2><div className="corner-grid">{cornerFields.map((field) => <label className="field compact-field" key={field.key}><span>{field.label}</span><input min="0" onChange={(event) => updateCornerRadius(field.key, Number(event.target.value))} type="number" value={cornerRadii[field.key]} /></label>)}</div></section> : null}
      {isTextSelected ? <section className="tool-section"><h2>Typography</h2><label className="field"><span>Font</span><select onChange={(event) => updateFontFamily(event.target.value)} value={fontFamily}>{fontOptions.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</select></label><label className="field"><span>Font size</span><input max="120" min="16" onChange={(event) => updateFontSize(Number(event.target.value))} type="range" value={fontSize} /><strong>{fontSize}px</strong></label><label className="field"><span>Align</span><div className="align-buttons"><button className={textAlign === 'left' ? 'active' : ''} onClick={() => updateTextAlign('left')} type="button">Left</button><button className={textAlign === 'center' ? 'active' : ''} onClick={() => updateTextAlign('center')} type="button">Center</button><button className={textAlign === 'right' ? 'active' : ''} onClick={() => updateTextAlign('right')} type="button">Right</button></div></label></section> : null}
    </aside>
  );
}

