<?php
/**
 * CSV Parser Utility for WinningProd V2
 * - Parses multiple CSV files
 * - Filters and sorts according to business logic
 * - Removes duplicates and shuffles results
 */

function parse_and_filter_csv_files(array $filePaths, int $rank = 100): array
{
    $allRows = [];

    foreach ($filePaths as $filePath) {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            continue;
        }
        $handle = fopen($filePath, 'r');
        if ($handle === false) continue;

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            continue;
        }

        // Map columns
        $colMap = array_flip($header);
        $required = ['productLink', 'Tren', 'isAd', 'Penjualan (30 Hari)'];
        foreach ($required as $col) {
            if (!isset($colMap[$col])) {
                fclose($handle);
                continue 2;
            }
        }

        while (($row = fgetcsv($handle)) !== false) {
            $rowAssoc = [
                'productLink' => $row[$colMap['productLink']] ?? '',
                'Tren'        => $row[$colMap['Tren']] ?? '',
                'isAd'        => $row[$colMap['isAd']] ?? '',
                'Penjualan'   => (int)preg_replace('/\D/', '', $row[$colMap['Penjualan (30 Hari)']] ?? '0')
            ];
            if (!empty($rowAssoc['productLink'])) {
                $allRows[] = $rowAssoc;
            }
        }
        fclose($handle);
    }

    // Remove rows where Tren == "TURUN"
    $filtered = array_filter($allRows, function($row) {
        return strtoupper($row['Tren']) !== 'TURUN';
    });

    // Keep all rows where Tren == "NAIK" AND isAd == "Yes"
    $naikYes = array_filter($filtered, function($row) {
        return strtoupper($row['Tren']) === 'NAIK' && strtoupper($row['isAd']) === 'YES';
    });

    // From remaining rows (Tren == "NAIK" AND isAd == "No"), sort by Penjualan desc and take top N
    $naikNo = array_filter($filtered, function($row) {
        return strtoupper($row['Tren']) === 'NAIK' && strtoupper($row['isAd']) === 'NO';
    });

    usort($naikNo, function($a, $b) {
        return $b['Penjualan'] <=> $a['Penjualan'];
    });

    $naikNoTop = array_slice($naikNo, 0, $rank);

    // Merge and remove duplicate productLink
    $merged = array_merge($naikYes, $naikNoTop);
    $unique = [];
    foreach ($merged as $row) {
        $unique[$row['productLink']] = $row;
    }
    $final = array_values($unique);

    // Shuffle results
    if (count($final) > 1) {
        shuffle($final);
    }

    return $final;
}