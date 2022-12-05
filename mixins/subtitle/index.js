import parseSRT from 'parse-srt'

const DEFAULT_CONF = {
  width: '100vw', y: '95vh', x: '50vw', anchor: [0.5, 1],
  align: 'center', valign: 'bottom',
  fontSize: '6vh', color: '#FFFFFF', 
  stroke: '#000000', strokeThickness: '10%',
};

const CLEAN_KEYS = ['id', 'refId', 'type', '_type', '_nodeName', 'innerHTML'];

const mixin = {
  defaultConf(key) {
    return DEFAULT_CONF[key];
  },

  async createNode() {
    const { conf } = this;
    let srtData;
    if (conf.src) {
      srtData = await this.getRemoteData(src, false);
    } else if (conf.innerHTML) {
      srtData = conf.innerHTML.trim();
    }
    try {
      this.subs = parseSRT(srtData);
      conf.duration = this.subs.at(-1).end;
    } catch (e) {
      console.error(e);
    }
    for (const k of CLEAN_KEYS) {
      delete conf[k];
    }
    for (const [k, v] of Object.entries(DEFAULT_CONF)) {
      if (conf[k] === undefined) conf[k] = this.getConf(k);
    }
    return {...conf, textEditable: false, type: 'text'};
  },

  async render(nodeTime, playing, view) {
    if (!this.node || this.node.type !== 'text') return;
    if (!this.current || this.current.start < nodeTime || this.current.end > nodeTime) {
      this.current = this.subs.find(sub => nodeTime >= sub.start && nodeTime <= sub.end);
    }
    this.node.conf.content = this.current ? this.current.text : '';
  }
};

if (window["pixi-player"].regMixin) {
  window["pixi-player"].regMixin({ 'subtitle': mixin });
}

export { mixin };  