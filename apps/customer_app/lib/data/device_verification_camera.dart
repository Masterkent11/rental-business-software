import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_commons/google_mlkit_commons.dart';
import '../features/application/domain/id_ocr_parser.dart';
import '../features/application/domain/verification.dart';
import '../features/application/domain/verification_capture.dart';
import 'mlkit_camera_image.dart';
import 'mlkit_verification_analyzer.dart';

class DeviceVerificationCamera extends ChangeNotifier {
  DeviceVerificationCamera({this.instruction});
  FaceInstruction? instruction;
  bool get front => instruction != null;
  CameraController? _controller;
  CameraController? get controller => _controller;
  final _analyzer = MlKitVerificationAnalyzer();
  String? error;
  String guidance = 'Position the front of your ID in the guide.';
  VoidCallback? onReady;
  bool _disposed = false;
  bool _capturing = false;
  bool _active = false;
  bool _autoCaptureArmed = true;
  Completer<void>? _captureCompleted;
  int _generation = 0;
  int _stableFrames = 0;
  String? _lastText;
  Future<void> _operations = Future.value();
  Future<void>? _analyzing;
  DateTime _lastFrame = DateTime.fromMillisecondsSinceEpoch(0);

  void updateInstruction(FaceInstruction? value) {
    if (instruction == value) return;
    instruction = value;
    _autoCaptureArmed = true;
    _stableFrames = 0;
    error = null;
  }

  Future<void> open() {
    final generation = ++_generation;
    _operations = _operations.catchError((_) {}).then((_) => _open(generation));
    return _operations;
  }

  Future<void> _open(int generation) async {
    await _closeCamera();
    if (_disposed || generation != _generation) return;
    error = null;
    _active = true;
    _autoCaptureArmed = true;
    if (kIsWeb || (defaultTargetPlatform != TargetPlatform.iOS && defaultTargetPlatform != TargetPlatform.android)) {
      error = 'ID scanning is available in the iOS and Android app.';
      notifyListeners();
      return;
    }
    notifyListeners();
    CameraController? pending;
    try {
      final cameras = await availableCameras();
      if (_disposed || generation != _generation) return;
      final matching = cameras
          .where((camera) => camera.lensDirection == (front ? CameraLensDirection.front : CameraLensDirection.back));
      if (matching.isEmpty) {
        throw CameraException('NoCamera', 'Required camera is unavailable.');
      }
      pending = CameraController(matching.first, ResolutionPreset.high,
          enableAudio: false, imageFormatGroup: Platform.isIOS ? ImageFormatGroup.bgra8888 : ImageFormatGroup.nv21);
      await pending.initialize();
      if (_disposed || generation != _generation) {
        await pending.dispose();
        return;
      }
      _controller = pending;
      await _startStream();
    } on CameraException catch (e) {
      await pending?.dispose();
      _controller = null;
      if (!_disposed && generation == _generation) {
        error = switch (e.code) {
          'CameraAccessDenied' => 'Camera access is needed to verify your identity. Allow it and try again.',
          'CameraAccessDeniedWithoutPrompt' => 'Enable camera access for WeStayPlace in Settings, then return here.',
          'CameraAccessRestricted' => 'Camera access is restricted on this device. Check your device settings.',
          _ => 'The camera is unavailable. Close other camera apps and try again.',
        };
      }
    } catch (_) {
      await pending?.dispose();
      _controller = null;
      if (!_disposed && generation == _generation) error = 'Could not open the camera. Please try again.';
    }
    if (!_disposed && generation == _generation) notifyListeners();
  }

  Future<void> _startStream() async {
    final camera = _controller;
    if (_disposed || !_active || camera == null || camera.value.isStreamingImages || _capturing) return;
    try {
      await camera.startImageStream(_frame);
    } on CameraException {
      guidance = 'Tap capture when ready. Live guidance is unavailable on this device.';
    }
  }

  void _frame(CameraImage frame) {
    if (_disposed || _capturing || _analyzing != null || DateTime.now().difference(_lastFrame).inMilliseconds < 350) {
      return;
    }
    final camera = _controller;
    if (camera == null) return;
    final image = mlKitCameraImage(frame, camera);
    if (image == null) {
      guidance = 'Tap capture when ready. Live guidance is unavailable on this device.';
      return;
    }
    _lastFrame = DateTime.now();
    final generation = _generation;
    final cue = instruction;
    _analyzing = _analyzeFrame(image, frame, camera, cue, generation).whenComplete(() => _analyzing = null);
  }

  Future<void> _analyzeFrame(
      InputImage image, CameraImage frame, CameraController camera, FaceInstruction? cue, int generation) async {
    try {
      String? problem;
      if (cue == null) {
        final ocr = await _analyzer.readFront(image);
        final text = ocr.details.toJson().values.join('|');
        final complete = ocr.readable && ocr.details.fullName.isNotEmpty && ocr.details.documentNumber.isNotEmpty;
        problem = complete ? null : 'Move closer, avoid glare and keep the ID text sharp.';
        if (_lastText != text) _stableFrames = 0;
        _lastText = text;
      } else {
        problem = await _analyzer.faceProblem(image, uprightImageSize(frame, camera), cue, mirrored: Platform.isIOS);
      }
      if (_disposed || generation != _generation || cue != instruction) return;
      _stableFrames = problem == null ? _stableFrames + 1 : 0;
      guidance = problem ?? 'Hold still — ready to capture.';
      notifyListeners();
      if (_stableFrames >= 3 && _autoCaptureArmed) {
        _autoCaptureArmed = false;
        _stableFrames = 0;
        onReady?.call();
      }
    } catch (_) {
      if (!_disposed && generation == _generation) {
        guidance = 'Tap capture to check the image.';
        notifyListeners();
      }
    }
  }

  Future<VerificationCapture?> capture() async {
    final camera = _controller;
    if (_capturing || camera == null || !camera.value.isInitialized) return null;
    final cue = instruction;
    _capturing = true;
    _captureCompleted = Completer<void>();
    error = null;
    XFile? file;
    try {
      if (camera.value.isStreamingImages) await camera.stopImageStream();
      await _analyzing;
      file = await camera.takePicture();
      if (await file.length() > 8 * 1024 * 1024) {
        error = 'The photo is too large. Please try again.';
        return null;
      }
      final input = InputImage.fromFilePath(file.path);
      IdOcrResult? ocr;
      final bytes = await file.readAsBytes();
      if (cue == null) {
        ocr = await _analyzer.readFront(input);
        if (!ocr.readable) {
          error = ocr.lineCount >= 4 && ocr.details.documentType.isEmpty
              ? 'This ID type is not supported yet. Use a Philippine National ID, driver’s license, passport, or Student ID.'
              : 'We could not read this ID. Use the front, avoid glare and hold the camera steady.';
          return null;
        }
      } else {
        final codec = await ui.instantiateImageCodec(bytes);
        final decoded = await codec.getNextFrame();
        final size = ui.Size(decoded.image.width.toDouble(), decoded.image.height.toDouble());
        decoded.image.dispose();
        codec.dispose();
        error = await _analyzer.faceProblem(input, size, cue, mirrored: false);
        if (error != null) return null;
      }
      if (_disposed) return null;
      return VerificationCapture(bytes, ocr: ocr, instruction: cue);
    } catch (_) {
      error = 'Could not process this capture. Check camera access and try again.';
      return null;
    } finally {
      if (file != null && !kIsWeb) {
        try {
          await File(file.path).delete();
        } on FileSystemException {
          error = 'Could not remove the temporary capture. Please close the app before retrying.';
        }
      }
      _capturing = false;
      _captureCompleted?.complete();
      _captureCompleted = null;
      _stableFrames = 0;
      if (!_disposed) {
        await _startStream();
        notifyListeners();
      }
    }
  }

  Future<void> _closeCamera() async {
    await _captureCompleted?.future;
    final current = _controller;
    _controller = null;
    if (current != null) {
      if (current.value.isStreamingImages) await current.stopImageStream();
      await _analyzing;
      await current.dispose();
    }
  }

  Future<void> close() {
    _active = false;
    ++_generation;
    _operations = _operations.catchError((_) {}).then((_) => _closeCamera());
    return _operations;
  }

  @override
  void dispose() {
    _disposed = true;
    onReady = null;
    unawaited(close().then((_) => _analyzer.close()));
    super.dispose();
  }
}
