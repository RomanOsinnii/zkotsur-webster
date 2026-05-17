import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

vi.mock('fabric', () => {
  class Shape {
    type = 'object';
    visible = true;
    selectable = true;
    evented = true;
    props: Record<string, unknown>;

    constructor(props: Record<string, unknown> = {}) {
      this.props = props;
      Object.assign(this, props);
    }

    get(key: string) {
      return this.props[key];
    }

    set(keyOrProps: string | Record<string, unknown>, value?: unknown) {
      if (typeof keyOrProps === 'string') {
        this.props[keyOrProps] = value;
      } else {
        this.props = { ...this.props, ...keyOrProps };
      }
    }

    scaleToWidth() {
      return undefined;
    }

    getBoundingRect() {
      return {
        left: Number(this.props.left ?? 0),
        top: Number(this.props.top ?? 0),
        width: Number(this.props.width ?? 100),
        height: Number(this.props.height ?? 100)
      };
    }

    getObjects() {
      return [];
    }

    removeAll() {
      return [];
    }

    clone() {
      return Promise.resolve(new Shape({ ...this.props }));
    }
  }

  class Canvas {
    active: Shape | null = null;
    viewportTransform: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
    selection = true;
    defaultCursor = 'default';
    objects: Shape[] = [];

    constructor() {
      return this;
    }

    add(...items: Shape[]) {
      this.active = items[0] ?? null;
      this.objects.push(...items);
    }

    setActiveObject(item: Shape) {
      this.active = item;
    }

    getActiveObject() {
      return this.active;
    }

    remove(...items: Shape[]) {
      this.objects = this.objects.filter((object) => !items.includes(object));
      this.active = null;
    }

    discardActiveObject() {
      this.active = null;
    }

    requestRenderAll() {
      return undefined;
    }

    setZoom() {
      return undefined;
    }

    getVpCenter() {
      return { x: 500, y: 400 };
    }

    getScenePoint() {
      return { x: 120, y: 120 };
    }

    getObjects() {
      return this.objects;
    }

    bringObjectForward() {
      return true;
    }

    sendObjectBackwards() {
      return true;
    }

    sendObjectToBack() {
      return true;
    }

    relativePan() {
      return undefined;
    }

    loadFromJSON() {
      return Promise.resolve(this);
    }

    toJSON() {
      return {};
    }

    on() {
      return undefined;
    }

    dispose() {
      return Promise.resolve();
    }

    toDataURL() {
      return 'data:image/png;base64,';
    }
  }

  return {
    ActiveSelection: Shape,
    Canvas,
    Circle: Shape,
    FabricImage: { fromURL: vi.fn(async () => new Shape()) },
    FabricObject: Shape,
    Gradient: Shape,
    Group: Shape,
    Point: Shape,
    Pattern: Shape,
    Path: Shape,
    Rect: Shape,
    Textbox: Shape,
    Triangle: Shape
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => []
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the design editor surface', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue as guest/i }));

    expect(screen.getByRole('heading', { name: /design editor/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create design/i }));
    expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument();
  });
});
