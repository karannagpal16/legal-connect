package in.legalconnect.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://www.legal-connect.in";
    private static final int FILE_CHOOSER_REQUEST = 4101;
    private static final int PERMISSION_REQUEST = 4102;
    private static final Set<String> INTERNAL_HOSTS = new HashSet<>(Arrays.asList(
            "legal-connect.in",
            "www.legal-connect.in",
            "legal-connect-7ewz.onrender.com",
            "checkout.razorpay.com",
            "api.razorpay.com"
    ));

    private WebView webView;
    private FrameLayout root;
    private LinearLayout loadingView;
    private LinearLayout offlineView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestNeededPermissions();
        buildLayout();
        configureWebView();
        if (isOnline()) {
            showLoading();
            webView.loadUrl(HOME_URL);
        } else {
            showOffline();
        }
    }

    private void buildLayout() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(6, 13, 24));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        loadingView = makeMessageView("Legal Connect", "Your Case. Our Mission.", true);
        offlineView = makeMessageView("Unable to connect to Legal Connect.", "Please check your internet connection and try again.", false);
        offlineView.setOnClickListener(v -> {
            if (isOnline()) {
                showLoading();
                webView.reload();
                if (webView.getUrl() == null) webView.loadUrl(HOME_URL);
            }
        });

        root.addView(loadingView);
        root.addView(offlineView);
        setContentView(root);
        showLoading();
    }

    private LinearLayout makeMessageView(String title, String subtitle, boolean spinner) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(48, 48, 48, 48);
        layout.setBackgroundColor(Color.rgb(6, 13, 24));

        TextView mark = new TextView(this);
        mark.setText("LC");
        mark.setTextColor(Color.rgb(212, 175, 55));
        mark.setTextSize(42);
        mark.setGravity(Gravity.CENTER);
        mark.setTypeface(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD);

        TextView heading = new TextView(this);
        heading.setText(title);
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(25);
        heading.setGravity(Gravity.CENTER);
        heading.setTypeface(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD);
        heading.setPadding(0, 28, 0, 8);

        TextView body = new TextView(this);
        body.setText(subtitle);
        body.setTextColor(Color.rgb(232, 219, 186));
        body.setTextSize(15);
        body.setGravity(Gravity.CENTER);
        body.setPadding(16, 8, 16, 20);

        layout.addView(mark);
        layout.addView(heading);
        layout.addView(body);
        if (spinner) {
            ProgressBar progress = new ProgressBar(this);
            layout.addView(progress);
        }

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        layout.setLayoutParams(params);
        return layout;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                showWeb();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOffline();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                Intent contentIntent = fileChooserParams.createIntent();
                contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(contentIntent, "Upload document");
                try {
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException ex) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        openExternal(request.getUrl());
                        return true;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        openExternal(Uri.parse(url));
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if ("mailto".equals(scheme) || "tel".equals(scheme) || "upi".equals(scheme)) {
            openExternal(uri);
            return true;
        }
        if ("https".equals(scheme) && INTERNAL_HOSTS.contains(host)) {
            return false;
        }
        if ("http".equals(scheme) || "https".equals(scheme)) {
            openExternal(uri);
            return true;
        }
        return false;
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            // External browser is unavailable; keep user inside the app.
        }
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkInfo info = cm == null ? null : cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    private void showLoading() {
        loadingView.setVisibility(View.VISIBLE);
        offlineView.setVisibility(View.GONE);
        webView.setVisibility(View.INVISIBLE);
    }

    private void showWeb() {
        loadingView.setVisibility(View.GONE);
        offlineView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }

    private void showOffline() {
        loadingView.setVisibility(View.GONE);
        offlineView.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
    }

    private void requestNeededPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        String readPermission = Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_IMAGES : Manifest.permission.READ_EXTERNAL_STORAGE;
        if (checkSelfPermission(readPermission) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{readPermission, Manifest.permission.CAMERA}, PERMISSION_REQUEST);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;
        Uri[] results = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}
