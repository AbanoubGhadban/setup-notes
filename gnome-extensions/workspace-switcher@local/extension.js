const Gio = imports.gi.Gio;

const BUS_NAME = 'com.workspace.Switcher';
const OBJECT_PATH = '/com/workspace/Switcher';

const DBUS_IFACE = `
<node>
  <interface name="com.workspace.Switcher">
    <method name="SwitchToWorkspace">
      <arg type="i" direction="in" name="index"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="GetActiveWorkspace">
      <arg type="i" direction="out" name="index"/>
    </method>
    <method name="GetWorkspaceCount">
      <arg type="i" direction="out" name="count"/>
    </method>
  </interface>
</node>`;

class Extension {
    constructor() {
        this._dbusObj = null;
        this._busOwnerId = 0;
    }

    enable() {
        this._dbusObj = Gio.DBusExportedObject.wrapJSObject(DBUS_IFACE, {
            SwitchToWorkspace: (index) => {
                const wm = global.workspace_manager;
                if (index < 0 || index >= wm.get_n_workspaces())
                    return false;
                const ws = wm.get_workspace_by_index(index);
                ws.activate(global.get_current_time());
                return true;
            },
            GetActiveWorkspace: () => {
                return global.workspace_manager.get_active_workspace_index();
            },
            GetWorkspaceCount: () => {
                return global.workspace_manager.get_n_workspaces();
            },
        });
        this._dbusObj.export(Gio.DBus.session, OBJECT_PATH);

        this._busOwnerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            BUS_NAME,
            Gio.BusNameOwnerFlags.NONE,
            null, null, null
        );

        log('WorkspaceSwitcher: enabled');
    }

    disable() {
        if (this._dbusObj) {
            this._dbusObj.unexport();
            this._dbusObj = null;
        }
        if (this._busOwnerId) {
            Gio.bus_unown_name(this._busOwnerId);
            this._busOwnerId = 0;
        }

        log('WorkspaceSwitcher: disabled');
    }
}

function init() {
    return new Extension();
}
