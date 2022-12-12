import lottie from 'lottie-web';

const DEFAULT_CONF = {
  width: '100vw', height: '100vh', 
  'object-fit': 'contain', loop: true,
  duration: 'contain'
};

const mixin = {
  defaultConf(key) {
    return DEFAULT_CONF[key];
  },

  async preload() {
    // load json
    const src = this.getConf('src', false);
    const animationData = await this.getRemoteData(src);
    let { w, h, nm, fr, ip, op } = animationData;

    const outbox = document.createElement('div');
    outbox.style.width = '0px';
    outbox.style.height = '0px';
    outbox.style.overflow = 'hidden';
    document.body.append(outbox); // must add to doc!

    // canvas will be same size as container
    const container = document.createElement('div');
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
    outbox.append(container);

    this.name = nm;
    this.frames = op - ip;
    this.length = this.frames / fr;
    this.ani = lottie.loadAnimation({
      container,
      animationData,
      autoplay: false,
      renderer: 'canvas',
    });
    await this.ready();

    this.canvas = container.childNodes[0];
    this.box = outbox;
    outbox.remove(); // remove from doc
  },

  async ready() {
    return new Promise((resolve) => {
      this.ani.addEventListener('DOMLoaded', (e) => {
        resolve()
      }, { once: true });
    });
  },

  async render(nodeTime, playing, view) {
    // const [ width, height ] = [this.getConf('width'), this.getConf('height')];
    // todo: resize?
    const canvas = view.source;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!nodeTime) nodeTime = 0.001;
    const len = this.material.length;
    const matTime = this.getConf('loop', false) ? nodeTime % len : Math.min(nodeTime, len);
    this.ani.goToAndStop(matTime * 1000, false); // isFrame = false (use time)

    const fit = this.getConf('object-fit', false);
    let dx = 0, dy = 0, dw = canvas.width, dh = canvas.height;
    if (fit !== 'fill') {
      const m = fit == 'cover' ? 'max' : 'min';
      const scale = Math[m](canvas.width / this.canvas.width, canvas.height / this.canvas.height);
      dw = scale * this.canvas.width;
      dh = scale * this.canvas.height;
      dx = (canvas.width - dw) * 0.5;
      dy = (canvas.height - dh) * 0.5;
    }
    ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, dx, dy, dw, dh);
    view.update();
  },

  destroy() {
    this.canvas = null;
    this.box = null;
    if (this.ani) this.ani.destroy();
    this.ani = null;
  },
}

if (window["pixi-player"].regMixin) {
  window["pixi-player"].regMixin({ 'lottie': mixin });
}

export { mixin };