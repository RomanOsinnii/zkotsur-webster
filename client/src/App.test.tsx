import { render, screen } from '@testing-library/react';
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
    window.history.replaceState({}, '', '/');
    const createStorage = () => {
      const store = new Map<string, string>();
      return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
        removeItem: vi.fn((key: string) => { store.delete(key); }),
        clear: vi.fn(() => { store.clear(); })
      };
    };

    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    })));
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => []
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects guests from root to the login page', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('opens the authentication page on the login route', async () => {
    window.history.replaceState({}, '', '/login');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('blocks direct access to protected routes for guests', async () => {
    window.history.replaceState({}, '', '/editor');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});
