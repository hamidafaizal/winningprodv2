<?php
/**
 * WhatsApp Utility for WinningProd V2
 * - Generates WhatsApp Web URLs with pre-filled messages
 * - Validates Indonesian phone numbers
 * - Formats batch messages (100 links, one per line)
 */

function is_valid_wa_number($number)
{
    // Accepts 62xxxxxxxxxx, 628xxxxxxxxx, etc.
    return preg_match('/^62\d{8,15}$/', $number);
}

function format_wa_message(array $links)
{
    // Only keep non-empty, valid URLs
    $cleanLinks = array_filter($links, function($link) {
        return filter_var($link, FILTER_VALIDATE_URL);
    });
    // Limit to 100 links per batch
    $cleanLinks = array_slice($cleanLinks, 0, 100);
    return implode("\n", $cleanLinks);
}

function generate_wa_url($number, array $links)
{
    if (!is_valid_wa_number($number)) {
        throw new InvalidArgumentException('Nomor WhatsApp tidak valid (harus format 62...)');
    }
    $message = format_wa_message($links);
    $encoded = rawurlencode($message);
    return "https://wa.me/{$number}?text=