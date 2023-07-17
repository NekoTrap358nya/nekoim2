
Promise.resolve().then(async () => {
  /**
   * This is a file generated using `yarn build`.
   * If you want to make changes, please modify `index.tpl.js` and run the command to generate it again.
   */
  const html = `__built_html__`
  const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout))
  const asyncCheck = async (getter, checkSize = 100, timeout = 1000) => {
    let target = getter()
    let num = 0
    while ((checkSize * num < timeout) && (target === undefined || target === null)) {
      await delay(checkSize)
      target = getter()
      num++
    }
    return target
  }
 const getTabIdxById = (id) => {
    const tabList = gradioApp().querySelectorAll('#tabs > .tabitem[id^=tab_]')
    return Array.from(tabList).findIndex((v) => v.id.includes(id))
  }

  const switch2targetTab = (idx) => {
    try {
      gradioApp().querySelector('#tabs').querySelectorAll('button')[idx].click()
    } catch (error) {
      console.error(error)
    }
  }

  /**
     * @type {HTMLDivElement}
     */
  const wrap = await asyncCheck(
    () => gradioApp().querySelector('#infinite_image_browsing_container_wrapper'),
    500,
    Infinity
  )
  wrap.childNodes.forEach((v) => wrap.removeChild(v))
  const iframe = document.createElement('iframe')
  iframe.srcdoc = html
  iframe.style = `width: 100%;height:100vh`
  wrap.appendChild(iframe)

  const imgTransferBus = new BroadcastChannel("iib-image-transfer-bus");
  imgTransferBus.addEventListener("message", async (ev) => {
    const data = JSON.parse(ev.data);
    if (typeof data !== 'object') {
      return
    }
    console.log(`iib-message:`, data)
    const appDoc = gradioApp()
    switch (data.event) {
      case 'click_hidden_button': {
        const btn = gradioApp().querySelector(`#${data.btnEleId}`);
        btn.click()
        break
      }
      case 'send_to_control_net':
      {
        data.type === 'img2img' ? window.switch_to_img2img() : window.switch_to_txt2img()
        await delay(100)
        const cn = appDoc.querySelector(`#${data.type}_controlnet`)
        const wrap = cn.querySelector('.label-wrap')
        if (!wrap.className.includes('open')) {
          wrap.click()
          await delay(100)
        }
        wrap.scrollIntoView()
        wrap.dispatchEvent(await createPasteEvent(data.url))
        break
      }
      case 'send_to_outpaint': {
        switch2targetTab(getTabIdxById("openOutpaint"))
        await delay(100)
        const iframe = appDoc.querySelector('#openoutpaint-iframe')
        openoutpaint_send_image(await imgUrl2DataUrl(data.url))
        iframe.contentWindow.postMessage({
					key: appDoc.querySelector('#openoutpaint-key').value,
					type: "openoutpaint/set-prompt",
					prompt: data.prompt,
					negPrompt: data.negPrompt,
				})
        break;
      }
    }

    function imgUrl2DataUrl(imgUrl) {
      return new Promise((resolve, reject) => {
        fetch(imgUrl)
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
              const dataURL = reader.result;
              resolve(dataURL);
            };
          })
          .catch(error => reject(error));
      });
    }

    async function createPasteEvent(imgUrl) {
      const response = await fetch(imgUrl)
      const imageBlob = await response.blob()
      const imageFile = new File([imageBlob], 'image.jpg', {
        type: imageBlob.type,
        lastModified: Date.now()
      })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(imageFile)
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true
      })
      return pasteEvent
    }
  })
})