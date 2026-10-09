import 'package:flutter/material.dart';

import '../../design/tokens.dart';
import '../../design/typography.dart';

sealed class ContentBlock {
  const ContentBlock();
}

final class HeadingBlock extends ContentBlock {
  const HeadingBlock(this.text);

  final String text;
}

final class ParagraphBlock extends ContentBlock {
  const ParagraphBlock(this.text);

  final String text;
}

final class BulletBlock extends ContentBlock {
  const BulletBlock(this.text);

  final String text;
}

List<ContentBlock> parseContent(String body) {
  final blocks = <ContentBlock>[];
  final paragraph = StringBuffer();
  void flush() {
    if (paragraph.isNotEmpty) {
      blocks.add(ParagraphBlock(paragraph.toString().trim()));
      paragraph.clear();
    }
  }

  for (final raw in body.split('\n')) {
    final line = raw.trimRight();
    if (line.trim().isEmpty) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.add(HeadingBlock(line.substring(3).trim()));
    } else if (line.startsWith('- ')) {
      flush();
      blocks.add(BulletBlock(line.substring(2).trim()));
    } else {
      if (paragraph.isNotEmpty) paragraph.write(' ');
      paragraph.write(line.trim());
    }
  }
  flush();
  return blocks;
}

class ContentBody extends StatelessWidget {
  const ContentBody({required this.body, super.key});

  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final block in parseContent(body))
          switch (block) {
            HeadingBlock(:final text) => Padding(
                padding: const EdgeInsets.only(top: Tokens.s20, bottom: Tokens.s8),
                child: Semantics(header: true, child: Text(text, style: AppText.cardTitle.copyWith(fontSize: 17))),
              ),
            ParagraphBlock(:final text) => Padding(
                padding: const EdgeInsets.only(bottom: Tokens.s12),
                child: Text(text, style: AppText.body),
              ),
            BulletBlock(:final text) => Padding(
                padding: const EdgeInsets.only(bottom: Tokens.s8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 8, right: Tokens.s12),
                      child: SizedBox(
                        width: 5,
                        height: 5,
                        child:
                            DecoratedBox(decoration: BoxDecoration(color: Tokens.primaryNavy, shape: BoxShape.circle)),
                      ),
                    ),
                    Expanded(child: Text(text, style: AppText.body)),
                  ],
                ),
              ),
          },
      ],
    );
  }
}
