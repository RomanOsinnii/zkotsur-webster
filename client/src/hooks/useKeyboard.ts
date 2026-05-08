import { MutableRefObject, RefObject, useEffect } from 'react';
import { ToolMode } from '../lib/editorTypes';

interface Params {
  activeFrameId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPanningRef: MutableRefObject<boolean>;
  setSpacePressed: (pressed: boolean) => void;
  setActiveTool: (tool: ToolMode) => void;
  removeSelected: () => void;
  copySelected: () => Promise<void>;
  pasteSelected: () => Promise<void>;
  undoFrame: () => void;
  redoFrame: () => void;
}

export function useKeyboard({
  activeFrameId, fileInputRef, isPanningRef,
  setSpacePressed, setActiveTool,
  removeSelected, copySelected, pasteSelected, undoFrame, redoFrame
}: Params) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingField =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' || target?.isContentEditable;
      if (isEditingField) return;

      const key = event.key.toLowerCase();
      const code = event.code;

      if (key === ' ') {
        event.preventDefault();
        setSpacePressed(true);
        return;
      }
      if (key === 'backspace' || key === 'delete') {
        event.preventDefault();
        removeSelected();
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (code === 'KeyV' || key === 'v') { event.preventDefault(); setActiveTool('select'); }
        if (code === 'KeyT' || key === 't') { event.preventDefault(); setActiveTool('text'); }
        if (code === 'KeyB' || code === 'KeyR' || key === 'b' || key === 'r') { event.preventDefault(); setActiveTool('box'); }
        if (code === 'KeyC' || key === 'c') { event.preventDefault(); setActiveTool('circle'); }
        if (code === 'KeyP' || key === 'p') { event.preventDefault(); setActiveTool('shape'); }
        if (code === 'KeyI' || key === 'i') { event.preventDefault(); fileInputRef.current?.click(); }
      }
      if (!event.ctrlKey && !event.metaKey) return;
      if (code === 'KeyC' || key === 'c') { event.preventDefault(); void copySelected(); }
      if (code === 'KeyV' || key === 'v') { event.preventDefault(); void pasteSelected(); }
      if (code === 'KeyZ' || key === 'z') {
        event.preventDefault();
        if (event.shiftKey) { redoFrame(); } else { undoFrame(); }
      }
      if (code === 'KeyY' || key === 'y') { event.preventDefault(); redoFrame(); }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        setSpacePressed(false);
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeFrameId]);
}
