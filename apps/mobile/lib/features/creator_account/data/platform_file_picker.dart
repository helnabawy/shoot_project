import 'package:file_picker/file_picker.dart' as files;
import 'package:flutter/services.dart' show PlatformException;
import 'package:image_picker/image_picker.dart' hide PickedFile;
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

/// The platform picker: the camera and the photo library through `image_picker` (the system photo
/// picker on Android and iOS, so no storage permission is asked), and "Files" (a photo or a PDF)
/// through `file_picker`.
final class ImagePickerFilePicker implements FilePicker {
  ImagePickerFilePicker([ImagePicker? picker])
    : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<PickedFile?> pick(PickSource source) async {
    try {
      if (source == PickSource.files) return await _pickFile();
      final file = await _picker.pickImage(
        source: source == PickSource.camera
            ? ImageSource.camera
            : ImageSource.gallery,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 85,
      );
      if (file == null) return null;
      return PickedFile(
        name: file.name,
        contentType: _contentType(file),
        bytes: await file.readAsBytes(),
      );
    } on PlatformException catch (e) {
      if (e.code == 'camera_access_denied' || e.code == 'photo_access_denied') {
        throw const PickDenied();
      }
      rethrow;
    }
  }

  Future<PickedFile?> _pickFile() async {
    final file = await files.FilePicker.pickFile(
      type: files.FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    );
    if (file == null) return null;
    final name = file.name;
    return PickedFile(
      name: name,
      contentType: _typeOfName(name),
      bytes: await file.xFile.readAsBytes(),
    );
  }

  static String _typeOfName(String name) {
    final n = name.toLowerCase();
    if (n.endsWith('.pdf')) return 'application/pdf';
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  static String _contentType(XFile file) {
    final mime = file.mimeType;
    if (mime != null && mime.startsWith('image/')) return mime;
    return _typeOfName(file.name);
  }
}
