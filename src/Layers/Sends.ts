/**
 * LaunchPad Pro Mk3 for Bitwig
 * 
 * by slow wild (inspo/code bits from fannon, respect. https://github.com/Fannon/)
 *
 * This file is part of the LaunchPad Pro Mk3 for Bitwig distribution (https://github.com/weskoop/LaunchPad-Pro-Mk3-for-Bitwig).
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
class SendsLayer extends Layer {
  public sendPages = 0;
  public sendPageIdx = 0;

  // Unfortunately we need to handle state and data for the SendBank.
  // [trackIdx][sendIdx]
  public sendFaders: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]]; // lol
  public sendColours: Colour[] = [new Colour, new Colour, new Colour, new Colour, new Colour, new Colour, new Colour, new Colour];

  activate() {
    ext.launchPad.setLayout(Layout.Fader, FaderBank.Sends);
    ext.buttons.setAllTrackButtonColours(Colours.SendsDim, Colours.Sends, this.getOrientation());
    this.selectTrackMode(Button.Sends);
    this.updateTrackFaders();
    this.updateSendScrolling();
    this.setGridModButtons(false);
  }

  deactivate() {
    ext.launchPad.stopFaders(FaderBank.Sends);
  }

  setSendColour(idx: number, colour: Colour) {
    this.sendColours[idx] = colour;
    this.updateSendColours();
  }

  getCurrentSendColour(): Colour {
    if (this.sendPageIdx < this.sendPages) {
      return this.sendColours[this.sendPageIdx];
    }
    return new Colour(0);
  }

  updateSendColours() {
    if (Layer.getCurrent() == this && ext.prefs.rainbowFaders.get()) {
      ext.launchPad.setFaderBank(FaderBank.Sends);

      // Show Available Colours.
      const o = this.getOrientation();
      if (ext.prefs.rainbowFaders.get()) {
        this.sendColours.fill(Colours.Off, this.sendPages, LaunchPad.numTracks - this.sendPages);
        ext.buttons.setEachSceneButtonColour(this.sendColours, Colours.Selected, o);
      } else {
        let colours = new Array<Colour>(LaunchPad.numTracks);
        colours.fill(Colours.Off, 0, LaunchPad.numTracks);
        colours.fill(Colours.SendsDim, 0, this.sendPages);
        ext.buttons.setEachSceneButtonColour(colours, Colours.Sends, o);
      }

      const selected = (this.sendPages > 0 && this.sendPageIdx < this.sendPages);
      ext.buttons.getSceneButton(this.sendPageIdx).setSelected(selected).draw(o);
    }
  }


  updateSceneColours() {
    // Do nothing.
  }

  updateTrackAndSceneToggles() {
    const o = this.getOrientation();
    for (let i = 0; i < LaunchPad.numTracks; i++) {
      ext.buttons.getTrackButton(i)
        .setEnabled(Layer.trackEnabled[i])
        .setSelected(this.trackToggles[i])
        .draw(o);
    }
  }

  updateOrientation() {
    ext.launchPad.setLayout(Layout.Fader, FaderBank.Sends);
    this.updateTrackFaders();
    if (Layer.isButtonHeld(Button.Shift)) {
      ext.buttons.drawShifted()
    } else {
      ext.buttons.draw(Layer.getCurrent().getOrientation());
    }
  }

  setSendFader(trackIdx: number, sendIdx: number, value: number) {
    this.sendFaders[trackIdx][sendIdx] = value;
    if (Layer.getCurrent() == this && sendIdx == this.sendPageIdx) {
      this.updateTrackFader(trackIdx);
    }
  }

  updateTrackFader(idx: number) {
    if (this.sendPageIdx < this.sendPages) {
      ext.midiDawOut.sendMidi(180, idx + 0x20, this.sendFaders[idx][this.sendPageIdx]);
    }
  }

  setTrackExists(idx: number, exists: boolean) {
    ext.launchPad.stopFaders(FaderBank.Sends);
    const colour = exists && (this.sendPages > 0) ? "2D" : "00";
    ext.midiDawOut.sendSysex(`${SysexPrefix} 01 02 ${Layer.getCurrent().getOrientation()} 0${idx} 00 0${idx} ${colour} F7`);
    if (exists) {
      this.updateTrackFader(idx);
    }
  }

  updateSendScrolling() {
    Layer.setScroll("sendsUp", this.sendPageIdx > 0);
    Layer.setScroll("sendsDown", this.sendPageIdx < (this.sendPages - 1));
    this.updateSendColours();
  }

  setPages(count: number) {
    const prevCount = this.sendPages;
    this.sendPages = Math.min(Math.max(count, 0), LaunchPad.numSends);
    if ((!prevCount != !count) && this == Layer.getCurrent()) {
      ext.launchPad.setFaderBank(FaderBank.Sends);
    }

    if (count > 0 && this.sendPageIdx >= count) {
      this.setPageIdx(count - 1);
    } else {
      this.updateSendScrolling();
    }
  }

  setPageIdx(idx: number) {
    this.sendPageIdx = Math.min(Math.max(idx, 0), this.sendPages - 1);
    if (this == Layer.getCurrent()) {
      ext.launchPad.stopFaders(FaderBank.Sends);
      this.selectScenePage(idx);
      this.updateTrackFaders();
      this.updateSendScrolling();
    }
  }

  getPageIdx() { return this.sendPageIdx; }
  getPages() { return this.sendPages; }

  onButtonPush(btn: Button) {
    ext.launchPad.stopFaders(FaderBank.Sends);

    if (Layer.isButtonHeld(Button.Shift)) {
      this.parent.onButtonPush(btn);
      return;
    }

    switch (btn) {
      case Button.Sends:
        Layer.setCurrent(Layers.Session);
        break;
      case Button.Up:
        if (this.getOrientation() == Orientation.Mix) {
          if (Layer.getScroll("sendsUp")) {
            this.setPageIdx(this.sendPageIdx - 1);
          }
        } else {
          ext.trackBank.scrollBackwards();
        }
        break;
      case Button.Down:
        if (this.getOrientation() == Orientation.Mix) {
          if (Layer.getScroll("sendsDown")) {
            this.setPageIdx(this.sendPageIdx + 1);
          }
        } else {
          ext.trackBank.scrollForwards();
        }
        break;
      case Button.Left:
        if (this.getOrientation() == Orientation.Mix) {
          ext.trackBank.scrollBackwards();
        } else {
          if (Layer.getScroll("sendsUp")) {
            this.setPageIdx(this.sendPageIdx - 1);
          }
        }
        break;
      case Button.Right:
        if (this.getOrientation() == Orientation.Mix) {
          ext.trackBank.scrollForwards();
        } else {
          if (Layer.getScroll("sendsDown")) {
            this.setPageIdx(this.sendPageIdx + 1);
          }
        }
        break;
      default:
        this.parent.onButtonPush(btn);
    }
  }

  onTrackPush(idx: number) {
    if (Layer.isButtonHeld(Button.Shift)) {
      return;
    }

    ext.launchPad.stopFaders(FaderBank.Sends);
    if (this.sendPageIdx < this.sendPages) {
      ext.trackBank.getItemAt(idx).sendBank().getItemAt(this.sendPageIdx).value().setImmediately(0);
    }
  }

  onScenePush(idx: number) {
    if (Layer.isButtonHeld(Button.Shift)) {
      return;
    }

    if (idx < this.sendPages) {
      this.setPageIdx(idx);
    }
  }

  updateScrolling() {
    let sendsUp = ext.buttons.getButton(Button.Up);
    let sendsDown = ext.buttons.getButton(Button.Down);
    let tracksUp = ext.buttons.getButton(Button.Left);
    let tracksDown = ext.buttons.getButton(Button.Right);

    if (Layer.orientation == Orientation.Arrange) {
      sendsUp = ext.buttons.getButton(Button.Left);
      sendsDown = ext.buttons.getButton(Button.Right);
      tracksUp = ext.buttons.getButton(Button.Up);
      tracksDown = ext.buttons.getButton(Button.Down);
    }

    sendsUp
      .setSelectedColour(Colours.Sends)
      .setSelected(Layer.getScroll("sendsUp"))
      .setShiftedColour(Colours.Off);
    sendsDown
      .setSelectedColour(Colours.Sends)
      .setSelected(Layer.getScroll("sendsDown"))
      .setShiftedColour(Colours.Off);
    tracksUp
      .setSelectedColour(Colours.Scroll)
      .setSelected(Layer.getScroll("tracksUp"))
      .setShiftedColour(Layer.getScroll("tracksUp") ? Colours.Selected : Colours.Off);
    tracksDown
      .setSelectedColour(Colours.Scroll)
      .setSelected(Layer.getScroll("tracksDown"))
      .setShiftedColour(Layer.getScroll("tracksDown") ? Colours.Selected : Colours.Off);

    const o = this.getOrientation();
    if (Layer.isButtonHeld(Button.Shift)) {
      tracksUp.drawShifted();
      tracksDown.drawShifted();
    } else {
      tracksUp.draw(o);
      tracksDown.draw(o);
      sendsUp.draw(o);
      sendsDown.draw(o);
    }

    this.updateSceneColours();
  }
}