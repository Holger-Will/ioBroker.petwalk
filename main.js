"use strict";

/*
 * Created with @iobroker/create-adapter v2.4.0
 */

const utils = require("@iobroker/adapter-core");

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class Petwalk extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "petwalk",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.interval = setInterval(async ()=>{
          try{
            let res = await fetch(this.config.ip + "/states")
            let dat = await res.json()
            
            let doorStateBool = dat.door==="open"?true:false
            let systemStateBool = dat.system==="on"?true:false
            
            let res2 = await fetch(this.config.ip+"/modes")
            let dat2 = await res2.json()
            
            this.refreshState("door", dat.door==="open"?true:false)
            this.refreshState("system", dat.system==="on"?true:false)
            this.refreshState("motion_in", dat2.motion_in)
            this.refreshState("motion_out", dat2.motion_out)
            this.refreshState("rfid", dat2.rfid)
            this.refreshState("time", dat2.time)
          } catch(err){
            this.log.error(err)
          }
        }, this.config.polling)
        
        this.subscribeStates("door")
        this.subscribeStates("system")
        this.subscribeStates("motion_in")
        this.subscribeStates("motion_out")
        this.subscribeStates("rfid")
        this.subscribeStates("time")
    }
    
    async refreshState(stateName, bool){
      this.getStateAsync(stateName, (err, st)=>{
        if(err){
          this.log.error(err)
          return
        }
        if(!err && !st){
          this.setState(stateName, bool, true)
          return
        }
        if(!st.ack){
          if(st.val === bool){
              // acknoledge newly set state
              this.setState(stateName, st.val, true)
          }
      } else {
          if(st.val !== bool){
              // got new state for door
              this.setState(stateName, bool, true)
          }
      }
      })
      
      
    }
    
    async sendCommand(endpoint, data){
      try{
        await fetch(this.config.ip + "/" + endpoint, {
          method:"PUT",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(data)
        })
      } catch(err) {
        this.log.error(err)
      }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            clearInterval(this.interval)
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
      let name = id.split(".").pop()

      if(!state.ack){
        switch(name){
          case "door":
            await this.sendCommand("states", {"door": state.val===true?"open":"closed"})
          break
          
          case "system":
            await this.sendCommand("states", {"system": state.val===true?"on":"off"})
          break
          
          case "motion_in":
            await this.sendCommand("modes", {"motion_in": state.val})
          break
          
          case "motion_out":
            await this.sendCommand("modes", {"motion_out": state.val})
          break
          
          case "rfid":
            await this.sendCommand("modes", {"rfid": state.val})
          break
          
          case "time":
            await this.sendCommand("modes", {"time": state.val})
          break
          
          default:
            this.log.info("unknown state: " + name)
          break
        }
        
      }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === "object" && obj.message) {
    //         if (obj.command === "send") {
    //             // e.g. send email or pushover or whatever
    //             this.log.info("send command");

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    //         }
    //     }
    // }

}



if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Petwalk(options);
} else {
    // otherwise start the instance directly
    new Petwalk();
}