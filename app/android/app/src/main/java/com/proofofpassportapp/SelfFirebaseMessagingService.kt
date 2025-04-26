package com.proofofpassportapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SelfFirebaseMessagingService : FirebaseMessagingService() {
    private val TAG = "FCMService"

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}")

        // Check if message contains notification payload.
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "Notification Title: ${notification.title}")
            Log.d(TAG, "Notification Body: ${notification.body}")
            
            // Process notification and show it
            showNotification(notification.title, notification.body)
        }

        // Check if message contains data payload.
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Data Payload: ${remoteMessage.data}")
            
            val title = remoteMessage.data["title"]
            val body = remoteMessage.data["body"]
            if (title != null && body != null) {
                showNotification(title, body)
            }
        }
    }

    override fun onNewToken(token: String) {
        // If you want to send messages to this application instance or
        // manage this app's subscriptions on the server side, send the
        // FCM registration token to your app server.
        Log.d(TAG, "Refreshed token: $token")
        // Implement any logic to send this token to your server if needed
    }

    private fun showNotification(title: String?, body: String?) {
        val channelId = "default-channel"
        val channelName = "Default Channel"
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        
        // Create a PendingIntent with the proper flags based on API level
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, pendingIntentFlags
        )

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVibrate(longArrayOf(0, 250, 250, 250))
            .setLights(Color.BLUE, 1000, 300)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Android O以上の場合は通知チャンネルを作成する必要があります
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                channelName,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Default channel for app notifications"
                enableLights(true)
                lightColor = Color.BLUE
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // 通知を表示
        val notificationId = System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, notificationBuilder.build())
        
        Log.d(TAG, "Notification displayed with ID: $notificationId")
    }
} 