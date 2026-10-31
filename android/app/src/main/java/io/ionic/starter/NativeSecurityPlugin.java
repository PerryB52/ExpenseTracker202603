package io.ionic.starter;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.view.WindowManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSecurity")
public class NativeSecurityPlugin extends Plugin {

    @PluginMethod
    public void setPrivacyScreen(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        activity.runOnUiThread(() -> {
            if (enabled) {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void isDeviceSecure(PluginCall call) {
        Context context = getContext();
        KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        boolean secure = keyguardManager != null && keyguardManager.isDeviceSecure();
        JSObject ret = new JSObject();
        ret.put("secure", secure);
        call.resolve(ret);
    }

    @PluginMethod
    @SuppressWarnings("deprecation")
    public void authenticateDevice(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        KeyguardManager keyguardManager = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager == null || !keyguardManager.isDeviceSecure()) {
            call.reject("Device does not have a secure lock screen configured");
            return;
        }

        String title = call.getString("title", "Unlock Expense Tracker");
        String description = call.getString("description", "Verify your identity to access your expenses");

        Intent intent = keyguardManager.createConfirmDeviceCredentialIntent(title, description);
        if (intent == null) {
            call.reject("Unable to create authentication prompt");
            return;
        }

        startActivityForResult(call, intent, "handleAuthResult");
    }

    @ActivityCallback
    private void handleAuthResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        JSObject ret = new JSObject();
        ret.put("authenticated", result.getResultCode() == Activity.RESULT_OK);
        call.resolve(ret);
    }
}

