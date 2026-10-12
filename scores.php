<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_THROW_ON_ERROR);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Method not allowed']);
}
$entry = null;
if ($method === 'POST') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('http://' . $_SERVER['HTTP_HOST'], PHP_URL_HOST)) {
        respond(403, ['error' => 'Use the game website to submit scores']);
    }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) respond(415, ['error' => 'JSON required']);
    $raw = file_get_contents('php://input', false, null, 0, 4097);
    if ($raw === false || strlen($raw) > 4096) respond(413, ['error' => 'Submission too large']);
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(400, ['error' => 'Invalid submission']);
    foreach (['score' => [1, 99999999], 'seconds' => [0, 86400], 'channels' => [1, 10000], 'ramp' => [0, 3], 'interval' => [0, 2], 'genres' => [1, 8]] as $key => [$min, $max]) {
        if (!isset($data[$key]) || !is_int($data[$key]) || $data[$key] < $min || $data[$key] > $max) respond(400, ['error' => 'Invalid run details']);
    }
    if (!is_string($data['name'] ?? null) || !preg_match('/^[A-Z0-9 _-]{1,12}$/D', $data['name']) || trim($data['name']) === '') respond(400, ['error' => 'Invalid player name']);
    if (!is_string($data['id'] ?? null) || !preg_match('/^[a-zA-Z0-9-]{8,80}$/D', $data['id'])) respond(400, ['error' => 'Invalid run ID']);
    if (!in_array($data['difficulty'] ?? '', ['easy', 'normal', 'hard'], true)) respond(400, ['error' => 'Invalid difficulty']);
    $entry = array_intersect_key($data, array_flip(['id', 'name', 'score', 'seconds', 'channels', 'difficulty', 'ramp', 'interval', 'genres']));
    $entry['date'] = gmdate('c');
}

// The PHP guard protects the storage file if it is requested through the web.
// Exclusive locking keeps simultaneous submissions from overwriting each other.
$prefix = "<?php exit; ?>\n";
$file = @fopen(getenv('CHANNEL_SURF_SCORE_FILE') ?: __DIR__ . '/score-data.php', 'c+');
if (!$file || !flock($file, $method === 'POST' ? LOCK_EX : LOCK_SH)) respond(503, ['error' => 'Score storage unavailable']);
$stored = stream_get_contents($file);
$scores = [];
if ($stored !== '') {
    if (!str_starts_with($stored, $prefix)) respond(503, ['error' => 'Score storage needs repair']);
    $scores = json_decode(substr($stored, strlen($prefix)), true);
    if (!is_array($scores) || !array_is_list($scores)) respond(503, ['error' => 'Score storage needs repair']);
}
if ($entry !== null) {
    $exists = false;
    foreach ($scores as $score) if ($score['id'] === $entry['id']) $exists = true;
    if (!$exists) $scores[] = $entry;
}
usort($scores, fn($a, $b) => ($b['score'] <=> $a['score']) ?: ($a['seconds'] <=> $b['seconds']) ?: strcmp($a['date'], $b['date']));
$scores = array_slice($scores, 0, 100);
if ($entry !== null) {
    $contents = $prefix . json_encode($scores, JSON_THROW_ON_ERROR);
    rewind($file);
    if (fwrite($file, $contents) !== strlen($contents) || !ftruncate($file, strlen($contents)) || !fflush($file)) respond(503, ['error' => 'Score could not be stored']);
}
flock($file, LOCK_UN);
fclose($file);
respond(200, ['scores' => array_slice($scores, 0, 20)]);
