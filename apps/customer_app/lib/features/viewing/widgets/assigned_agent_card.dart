import 'package:flutter/material.dart';

import '../../../data/viewing_repository.dart';
import '../../../design/tokens.dart';
import 'viewing_icon.dart';

class AssignedAgentCard extends StatelessWidget {
  const AssignedAgentCard({required this.agent, required this.onMessage, super.key});

  final AssignedAgentView agent;
  final VoidCallback onMessage;

  @override
  Widget build(BuildContext context) {
    final photo = agent.photoUrl;
    return Container(
      padding: const EdgeInsets.fromLTRB(Tokens.s12, Tokens.s12, Tokens.s8, Tokens.s12),
      decoration: BoxDecoration(
        color: Tokens.card,
        borderRadius: BorderRadius.circular(Tokens.rControl),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: Tokens.softBlue,
            foregroundImage: photo == null ? null : NetworkImage(photo),
            onForegroundImageError: photo == null ? null : (_, __) {},
            child: Text(
              agent.initials,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
            ),
          ),
          const SizedBox(width: Tokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        agent.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
                      ),
                    ),
                    if (agent.verified) ...[
                      const SizedBox(width: Tokens.s4),
                      const ViewingIcon(ViewingGlyph.verified, size: 16, color: null, semanticLabel: 'Verified agent'),
                    ],
                  ],
                ),
                if (agent.role.isNotEmpty) ...[
                  const SizedBox(height: Tokens.s2),
                  Text(
                    agent.role,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12.5, color: Tokens.muted),
                  ),
                ],
                if (agent.organizationName.isNotEmpty) ...[
                  const SizedBox(height: Tokens.s2),
                  Text(
                    agent.organizationName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12.5, color: Tokens.muted),
                  ),
                ],
              ],
            ),
          ),
          Semantics(
            button: true,
            label: 'Message ${agent.displayName}',
            excludeSemantics: true,
            child: Tooltip(
              message: 'Message ${agent.displayName}',
              child: InkResponse(
                onTap: onMessage,
                radius: Tokens.tap / 2,
                child: SizedBox.square(
                  dimension: Tokens.tap,
                  child: Center(
                    child: Container(
                      width: 38,
                      height: 38,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Tokens.hairline),
                      ),
                      child: const ViewingIcon(ViewingGlyph.message, size: 18),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
