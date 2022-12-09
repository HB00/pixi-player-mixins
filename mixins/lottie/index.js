// import lottie from 'lottie-web';

import lottie from 'lottie-nodejs';
lottie.setCanvas({Image});

const DEFAULT_CONF = {
  width: '100vw', height: '100vh', 'object-fit': 'contain',
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

    // resize canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;

    this.name = nm;
    this.frames = op - ip;
    this.conf.duration = this.length = this.frames / fr;
    this.ani = lottie.loadAnimation({
      container: this.canvas, 
      animationData,
      autoplay: false,
      renderer: 'canvas',
    });

    // document.body.append(this.canvas);
  },

  async render(nodeTime, playing, view) {
    // const [ width, height ] = [this.getConf('width'), this.getConf('height')];
    // todo: resize?
    const canvas = view.source;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!nodeTime) nodeTime = 0.001;
    this.ani.goToAndStop(nodeTime * 1000, false); // isFrame = false (use time)

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

}

if (window["pixi-player"].regMixin) {
  window["pixi-player"].regMixin({ 'lottie': mixin });
}

export { mixin };