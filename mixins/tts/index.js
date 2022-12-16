const DEFAULT_CONF = {
  width: '80vw', y: '65vh', x: '50vw', 
  fontSize: '20rpx', color: '#FFFFFF', 
  stroke: '#000000', strokeThickness: '20%',
};

const CLEAN_KEYS = ['id', 'refId', 'type', '_type', '_nodeName', 'innerHTML'];

const mixin = {
  defaultConf(key) {
    return DEFAULT_CONF[key];
  },

  async createNode() {
    const conf = JSON.parse(JSON.stringify(this.conf)); // deep copy
    let content = this.getConf('content', false);
    let voice = this.getConf('voice', false);
    let language = this.getConf('language', false);
    let speed = this.getConf('speed', false);
    // let title = this.getConf('title', false);
    // if (!content && title) {
    //   content = await this.getContent(title);
    //   conf.content = content;
    // }
    if (!content) return null;
    const { lines, duration, src } = await this.getTTS(content, voice, language, speed);
    // console.log('createNode', {lines, duration, src});
    if (!lines || !src) return;
    conf.duration = duration;
    this.subs = lines;
    // console.log(lines);
    for (const k of CLEAN_KEYS) {
      delete conf[k];
    }
    for (const [k, v] of Object.entries(DEFAULT_CONF)) {
      if (conf[k] === undefined) conf[k] = v;
    }
    const children = [{
      type: 'audio', src, duration,
    }];
    return {...conf, textEditable: false, type: 'text', duration, children};
  },

  nodeUpdated() {
    this.node.on('updated', (e) => {
      // 当修改text属性的时候，同步回mixin的conf里
      for (const [k, v] of Object.entries(e.changed)) {
        this.setConf(k, v.to);
      }
    });
  },

  async updateView(senderId, changeAttr) {
    if (changeAttr?.title || changeAttr?.content || changeAttr?.voice) {
      await this.initNode();
      if (this.node) {
        await this.node.preload();
        await this.node.children[0].preload();
      }
    }
  },

  async render(nodeTime, playing, view) {
    if (!this.node || this.node.type !== 'text') return;
    if (!this.current || this.current.start < nodeTime || this.current.end > nodeTime) {
      this.current = this.subs.find(sub => nodeTime >= sub.start && nodeTime <= sub.end);
    }
    this.node.conf.content = this.current ? this.current.text : '';
  },

  async getTTS(text, voice, language='zh-CN', speed=1) {
    speed = Number(speed);
    text = text.replaceAll(/[，。！]/g, '\n')
               .split('\n').map(l => l.trim()).filter(x => x).join('\n');
    // let text = '教授要把自己机器人\n结果被机器人灭了\n最后还是活了';
    const req = { text };
    if (voice) {
      req.name = `Microsoft Server Speech Text to Speech Voice (${language}, ${voice})`;
    }
    if (speed != 1 && speed > 0.5 && speed < 2) {
      req.rate = speed;
    }
    const res = await fetch('https://afu.mirav.cn/api/v0.3/editor/tts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'hcookie-sessionid': 'd54e242bb56e42aeab18d6515cb965f3',
      },
      body: JSON.stringify(req)
    });
    const json = await res.json();
    if (json.code === 200 && json.data?.audio_url) {
      const duration = Number(json.data.duration);
      // console.log(json.data);
      const lines = [];
      let i = 0;
      for (const line of text.split('\n')) {
        const len = Array.from(line).length;
        lines.push({text:line, i, len});
        i += len + 1;
      }

      const offset = json.data.word_boundary_list[0].text_offset;
      let li = 0;
      for (const w of json.data.word_boundary_list) {
        const { audio_offset, text_offset, word } = w;
        const ti = text_offset - offset;
        const time = audio_offset * 0.001;
        if (ti > lines[li].i + lines[li].len) {
          lines[li].end = time - 0.01; // 紧贴着
          li++;
          lines[li].start = time;
        }
      }
      // first & last
      lines[0].start = 0;
      for (let i = li; i < lines.length; i++) {
        lines[i].end = duration;
      }
      return { lines, duration, src: json.data.audio_url };
    }
    return {};
  },

  // async getContent(title) {
  //   const res = await fetch('http://localhost:8016/cnt', {
  //     method: 'POST',
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({title})
  //   });
  //   const json = await res.json();
  //   console.log(json);
  //   return json.code === 200 ? json.content : '';
  // }
};

if (window["pixi-player"].regMixin) {
  window["pixi-player"].regMixin({ 'tts': mixin });
}

export { mixin };